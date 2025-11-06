
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type Customer, type Sale, type Payment, type BankAccount, type BankTransaction } from '@/lib/data';
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
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, runTransaction, DocumentReference, DocumentSnapshot } from 'firebase/firestore';


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

interface CustomerLedgerDetailProps {
    customerSales: Sale[] | null;
    customerPayments: Payment[] | null;
    isLoading: boolean;
}

export default function CustomerLedgerDetail({ customerSales, customerPayments, isLoading }: CustomerLedgerDetailProps) {
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
    const bankAccountsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'my_bank_accounts') : null, [firestore]);
    const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsCollection);
    
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
            onlinePaymentSource: p.onlinePaymentSource,
            notes: p.notes,
            receiptImageUrl: p.receiptImageUrl,
          }
        }));
        
        const allTransactions = [...salesTransactions, ...paymentTransactions]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
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
        if (!customerRef || !firestore || !customer) return;

        try {
            await runTransaction(firestore, async (transaction) => {
                // --- ALL READS MUST COME BEFORE WRITES ---

                const customerDoc = await transaction.get(customerRef);
                if (!customerDoc.exists()) throw new Error("Customer not found!");

                let oldPaymentDoc: DocumentSnapshot | null = null;
                if (transactionToEdit && transactionToEdit.type === 'Payment') {
                    const paymentRef = doc(firestore, 'payments', transactionToEdit.id);
                    oldPaymentDoc = await transaction.get(paymentRef);
                }

                let oldBankSnap: DocumentSnapshot | null = null;
                const oldOnlinePaymentSource = oldPaymentDoc?.data()?.onlinePaymentSource;
                if (oldOnlinePaymentSource) {
                    oldBankSnap = await transaction.get(doc(firestore, 'my_bank_accounts', oldOnlinePaymentSource));
                }
                
                let newBankSnap: DocumentSnapshot | null = null;
                if (paymentData.paymentMethod === 'Online' && paymentData.onlinePaymentSource) {
                    newBankSnap = await transaction.get(doc(firestore, 'my_bank_accounts', paymentData.onlinePaymentSource));
                }

                // --- ALL WRITES START FROM HERE ---

                const currentBalance = customerDoc.data().balance || 0;
                const oldAmount = oldPaymentDoc?.data()?.amount || 0;

                const paymentPayload: Omit<Payment, 'customer' | 'id'> = {
                    amount: paymentData.amount,
                    date: paymentData.paymentDate.toISOString(),
                    paymentMethod: paymentData.paymentMethod,
                    onlinePaymentSource: paymentData.onlinePaymentSource || '',
                    notes: paymentData.notes || '',
                    receiptImageUrl: paymentData.receiptImageUrl || '',
                    reference: transactionToEdit?.reference || `RECV-${Date.now().toString().slice(-6)}`,
                };
                
                let paymentRef: DocumentReference;
                if (transactionToEdit && transactionToEdit.type === 'Payment') {
                    paymentRef = doc(firestore, 'payments', transactionToEdit.id);
                    const difference = paymentData.amount - oldAmount;
                    transaction.update(paymentRef, paymentPayload);
                    transaction.update(customerRef, { balance: currentBalance - difference });
                } else {
                    paymentRef = doc(collection(firestore, 'payments'));
                    transaction.set(paymentRef, { ...paymentPayload, customer: customerRef });
                    transaction.update(customerRef, { balance: currentBalance - paymentData.amount });
                }

                // Revert old transaction if online source changed
                if (oldBankSnap?.exists() && oldOnlinePaymentSource !== paymentData.onlinePaymentSource) {
                    const oldBankRef = oldBankSnap.ref;
                    const oldBankBalance = oldBankSnap.data()?.balance || 0;
                    transaction.update(oldBankRef, { balance: oldBankBalance - oldAmount });
                }

                // Add new transaction if it's online
                if (newBankSnap?.exists() && paymentData.paymentMethod === 'Online' && paymentData.onlinePaymentSource) {
                    const newBankRef = newBankSnap.ref;
                    const currentBankBalance = newBankSnap.data()?.balance || 0;
                    const amountToCredit = paymentData.amount - (oldOnlinePaymentSource === paymentData.onlinePaymentSource ? oldAmount : 0);

                    if (amountToCredit !== 0) {
                        const newBalance = currentBankBalance + amountToCredit;
                        transaction.update(newBankRef, { balance: newBalance });

                        const txRef = doc(collection(firestore, 'bank_transactions'));
                        const txPayload: Omit<BankTransaction, 'id'> = {
                            accountId: paymentData.onlinePaymentSource,
                            date: paymentData.paymentDate.toISOString(),
                            description: `${transactionToEdit ? 'Update for' : 'Payment from'} ${customer.name}`,
                            type: 'Credit',
                            amount: amountToCredit,
                            balanceAfter: newBalance,
                            referenceId: paymentRef.id,
                            referenceType: 'Customer Payment'
                        };
                        transaction.set(txRef, txPayload);
                    }
                }
            });

             toast({ title: transactionToEdit ? "Payment Updated" : "Payment Added", description: "The payment has been recorded successfully." });

        } catch (error) {
            console.error("Payment transaction failed: ", error);
            toast({ variant: "destructive", title: "Error", description: (error as Error).message || "Could not save the payment." });
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
                if (!customerDoc.exists()) throw new Error("Customer not found!");

                const collectionName = transactionToDelete.type === 'Sale' ? 'sales' : 'payments';
                const ref = doc(firestore, collectionName, transactionToDelete.id);
                
                const docToDeleteSnap = await transaction.get(ref);
                if(!docToDeleteSnap.exists()) throw new Error("Transaction to delete not found!");
                const docToDelete = docToDeleteSnap.data();

                const currentBalance = customerDoc.data().balance || 0;
                let newBalance: number;

                if (transactionToDelete.type === 'Payment') {
                    newBalance = currentBalance + transactionToDelete.credit;
                    if (docToDelete.paymentMethod === 'Online' && docToDelete.onlinePaymentSource) {
                        const bankRef = doc(firestore, 'my_bank_accounts', docToDelete.onlinePaymentSource);
                        const bankSnap = await transaction.get(bankRef);
                        if (bankSnap.exists()) {
                            const currentBankBalance = bankSnap.data().balance;
                            transaction.update(bankRef, { balance: currentBankBalance - docToDelete.amount });
                        }
                    }
                } else { // Sale
                    newBalance = currentBalance - transactionToDelete.debit;
                }
                
                transaction.update(customerRef, { balance: newBalance });
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

    if (isCustomerLoading || isLoading) {
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
            bankAccounts={bankAccounts || []}
            isLoadingBankAccounts={isLoadingBankAccounts}
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
    

    
