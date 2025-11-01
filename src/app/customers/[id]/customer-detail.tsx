'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type Customer, type Sale, type Payment } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentDialog } from './payment-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import type { PaymentFormData } from './payment-dialog';
import Link from 'next/link';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, runTransaction, DocumentReference } from 'firebase/firestore';


export interface Transaction {
    id: string;
    date: string;
    type: 'Sale' | 'Payment';
    reference: string;
    debit: number;
    credit: number;
    balance: number;
    paymentDetails?: Omit<PaymentFormData, 'amount'> & { receiptImageUrl?: string };
}

export default function CustomerLedgerDetail() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const customerId = params.id as string;

    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const customerRef = useMemoFirebase(() => customerId && firestore ? doc(firestore, 'customers', customerId) : null, [firestore, customerId]);
    const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerRef);

    const salesQuery = useMemoFirebase(() => {
      if (!firestore || !customerId) return null;
      return query(collection(firestore, 'sales'), where('customer', '==', doc(firestore, 'customers', customerId)));
    }, [firestore, customerId]);
    const { data: customerSales, isLoading: areSalesLoading } = useCollection<Sale>(salesQuery);
    
    const paymentsQuery = useMemoFirebase(() => {
      if (!firestore || !customerId) return null;
      return query(collection(firestore, 'payments'), where('customer', '==', doc(firestore, 'customers', customerId)));
    }, [firestore, customerId]);
    const { data: customerPayments, isLoading: arePaymentsLoading } = useCollection<Payment>(paymentsQuery);

    useEffect(() => {
      if (customerSales && customerPayments && customer) {
        const salesTransactions: Transaction[] = customerSales.map(s => ({
          id: s.id,
          date: s.date,
          type: 'Sale',
          reference: s.invoice,
          debit: s.total,
          credit: 0,
          balance: 0,
        }));
        
        const paymentTransactions: Transaction[] = customerPayments.map(p => ({
          id: p.id,
          date: p.date,
          type: 'Payment',
          reference: p.reference || `PAY-${p.id.substring(0,6)}`,
          debit: 0,
          credit: p.amount,
          balance: 0,
          paymentDetails: {
            paymentDate: new Date(p.date),
            paymentMethod: p.paymentMethod,
            notes: p.notes,
            receiptImageUrl: p.receiptImageUrl,
          }
        }));
        
        const allTransactions = [...salesTransactions, ...paymentTransactions]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // To calculate historical balance correctly, we need the balance *before* the first transaction shown.
        const totalCredits = allTransactions.reduce((sum, tx) => sum + tx.credit, 0);
        const totalDebits = allTransactions.reduce((sum, tx) => sum + tx.debit, 0);
        let startingBalance = customer.balance - totalDebits + totalCredits;
        
        const finalTransactions = allTransactions.map(tx => {
          startingBalance += tx.debit - tx.credit;
          return { ...tx, balance: startingBalance };
        });
        
        setTransactions(finalTransactions.reverse());
      }
    }, [customerSales, customerPayments, customer]);


    const handleSavePayment = async (paymentData: PaymentFormData) => {
        if (!customerRef || !firestore) return;

        try {
            await runTransaction(firestore, async (transaction) => {
                // --- 1. ALL READS FIRST ---
                const customerDoc = await transaction.get(customerRef);
                if (!customerDoc.exists()) {
                    throw new Error("Customer not found!");
                }

                let oldAmount = 0;
                if (transactionToEdit && transactionToEdit.type === 'Payment') {
                    const paymentRef = doc(firestore, 'payments', transactionToEdit.id);
                    const oldPaymentDoc = await transaction.get(paymentRef);
                    if (!oldPaymentDoc.exists()) {
                        throw new Error("Payment to edit not found!");
                    }
                    oldAmount = oldPaymentDoc.data().amount || 0;
                }

                // --- 2. PREPARE WRITES ---
                const currentBalance = customerDoc.data().balance || 0;
                
                if (transactionToEdit && transactionToEdit.type === 'Payment') {
                    // Editing an existing payment
                    const paymentRef = doc(firestore, 'payments', transactionToEdit.id);
                    const newAmount = paymentData.amount;
                    const difference = newAmount - oldAmount; // if new is > old, diff is positive. Balance should decrease.

                    transaction.update(paymentRef, {
                        amount: newAmount,
                        date: paymentData.paymentDate.toISOString(),
                        paymentMethod: paymentData.paymentMethod,
                        notes: paymentData.notes,
                        receiptImageUrl: paymentData.receiptImageUrl,
                    });
                    transaction.update(customerRef, { balance: currentBalance - difference });

                } else {
                    // Adding a new payment
                    const newPaymentRef = doc(collection(firestore, 'payments'));
                    const newPayment: Omit<Payment, 'id'> = {
                        customer: customerRef,
                        amount: paymentData.amount,
                        date: paymentData.paymentDate.toISOString(),
                        paymentMethod: paymentData.paymentMethod,
                        notes: paymentData.notes || '',
                        receiptImageUrl: paymentData.receiptImageUrl || '',
                        reference: `RECV-${Date.now().toString().slice(-6)}`,
                    };
                    
                    transaction.set(newPaymentRef, newPayment);
                    transaction.update(customerRef, { balance: currentBalance - paymentData.amount });
                }
            });

             if (transactionToEdit) {
                toast({ title: "Payment Updated", description: "The payment has been updated successfully." });
             } else {
                toast({ title: "Payment Added", description: "The payment has been recorded." });
             }

        } catch (error) {
            console.error("Payment transaction failed: ", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save the payment." });
        }


        setIsPaymentDialogOpen(false);
        setTransactionToEdit(null);
    }
    
    const handleEditPayment = (tx: Transaction) => {
        setTransactionToEdit(tx);
        setIsPaymentDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!transactionToDelete || !customerRef || !firestore) return;

        try {
             await runTransaction(firestore, async (transaction) => {
                const customerDoc = await transaction.get(customerRef);
                if (!customerDoc.exists()) {
                    throw new Error("Customer not found!");
                }

                let ref;
                if (transactionToDelete.type === 'Payment') {
                    ref = doc(firestore, 'payments', transactionToDelete.id);
                } else { // Sale
                    ref = doc(firestore, 'sales', transactionToDelete.id);
                }
                
                const docToDelete = await transaction.get(ref);
                if(!docToDelete.exists()) {
                   throw new Error("Transaction to delete not found!");
                }

                // All reads are done. Now perform writes.
                const currentBalance = customerDoc.data().balance || 0;
                let amount;

                if (transactionToDelete.type === 'Payment') {
                    amount = transactionToDelete.credit;
                     // Deleting a payment increases the customer's balance (they owe more)
                    transaction.update(customerRef, { balance: currentBalance + amount });
                } else { // Sale
                    amount = transactionToDelete.debit;
                    // Deleting a sale decreases the customer's balance (they owe less)
                    transaction.update(customerRef, { balance: currentBalance - amount });
                }
                
                transaction.delete(ref);
             });
             toast({ title: "Transaction Deleted", description: "The transaction has been removed and balance updated." });

        } catch (error) {
             console.error("Delete transaction failed: ", error);
             toast({ variant: "destructive", title: "Error", description: "Could not delete the transaction." });
        }

        setTransactionToDelete(null);
    }

    const getBalanceVariant = (balance: number): "default" | "secondary" | "destructive" => {
        if (balance > 0) return 'destructive';
        if (balance < 0) return 'secondary';
        return 'default';
    }

    if (isCustomerLoading || areSalesLoading || arePaymentsLoading) {
        return <div className="p-8">Loading customer information...</div>;
    }
    
    if (!customer) {
        return <div className="p-8">Customer not found.</div>;
    }


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-2xl">{customer.name}</CardTitle>
                    <CardDescription>{customer.phone} - {customer.vehicleDetails}</CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                     <Badge variant={getBalanceVariant(customer.balance)} className="text-xl font-mono">
                       Rs. {Math.abs(customer.balance).toLocaleString()} {customer.balance < 0 ? ' (Adv)' : ''}
                    </Badge>
                </div>
            </CardHeader>
        </Card>

         <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Transaction Ledger</CardTitle>
                    <CardDescription>
                    History of all sales and payments with {customer.name}.
                    </CardDescription>
                </div>
                <Button onClick={() => { setTransactionToEdit(null); setIsPaymentDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Payment
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx) => (
                            <TableRow key={tx.id}>
                                <TableCell>{format(new Date(tx.date), 'dd MMM, yyyy')}</TableCell>
                                <TableCell>
                                    <Badge variant={tx.type === 'Sale' ? 'outline' : 'secondary'}>
                                        {tx.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{tx.reference}</TableCell>
                                <TableCell className="text-right font-mono">{tx.debit > 0 ? `Rs. ${tx.debit.toLocaleString()}`: '-'}</TableCell>
                                <TableCell className="text-right font-mono text-green-600">{tx.credit > 0 ? `Rs. ${tx.credit.toLocaleString()}` : '-'}</TableCell>
                                <TableCell className="text-right font-mono">{`Rs. ${Math.abs(tx.balance).toLocaleString()}`}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {tx.type === 'Sale' ? (
                                                <>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/sales/invoice/${tx.id}`}>
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            View Invoice
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                         <Link href={`/sales/${tx.id}`}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit Sale
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </>
                                            ) : (
                                                <DropdownMenuItem onSelect={() => handleEditPayment(tx)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit Payment
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => setTransactionToDelete(tx)} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
         </Card>

        <PaymentDialog 
            isOpen={isPaymentDialogOpen}
            onClose={() => { setIsPaymentDialogOpen(false); setTransactionToEdit(null); }}
            onSave={handleSavePayment}
            customerName={customer.name}
            payment={transactionToEdit}
        />

        <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the transaction with reference "{transactionToDelete?.reference}". This will also update the customer's balance. This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}