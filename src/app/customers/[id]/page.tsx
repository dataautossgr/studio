'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type Customer, type Sale } from '@/lib/data';
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
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentDialog } from './payment-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { collection, doc, query, where } from 'firebase/firestore';


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

export default function CustomerLedgerPage() {
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
      if (!customerRef || !firestore) return null;
      return query(collection(firestore, 'sales'), where('customer', '==', customerRef));
    }, [firestore, customerRef]);
    const { data: customerSales, isLoading: areSalesLoading } = useCollection<Sale>(salesQuery);

    useEffect(() => {
        if (customer && customerSales) {
            const salesTransactions: Transaction[] = customerSales.map(s => ({
                id: s.id,
                date: s.date,
                type: 'Sale',
                reference: s.invoice,
                debit: s.total,
                credit: 0,
                balance: 0 // Will be calculated later
            }));

            // MOCK PAYMENTS - This will be replaced with real data later
            const mockPayments = [
                { id: 'PAY001', date: '2024-07-22T18:00:00Z', amount: 1000, paymentMethod: 'Cash' as const, notes: 'Advance for next service' },
            ];
            
            const paymentTransactions: Transaction[] = mockPayments.map((p, i) => ({
                id: p.id,
                date: p.date,
                type: 'Payment',
                reference: `RECV-00${i + 1}`,
                debit: 0,
                credit: p.amount,
                balance: 0, // Will be calculated later
                paymentDetails: {
                  paymentDate: new Date(p.date),
                  paymentMethod: p.paymentMethod,
                  notes: p.notes,
                }
            }));
            
            const allTransactions = [...salesTransactions, ...paymentTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            let currentBalance = customer.balance;
            const finalTransactions = allTransactions.map(tx => {
                const txWithBalance = {...tx, balance: currentBalance};
                if (tx.type === 'Sale') {
                    currentBalance -= tx.debit;
                } else {
                    currentBalance += tx.credit;
                }
                return txWithBalance;
            }).reverse(); // Reverse to show oldest first for correct balance calculation, then reverse back
            
            let runningBalance = finalTransactions.length > 0 ? finalTransactions[0].balance - (finalTransactions[0].type === 'Sale' ? finalTransactions[0].debit : -finalTransactions[0].credit) : customer.balance;
            const chronologicalTransactions = finalTransactions.reverse().map(tx => {
                if (tx.type === 'Sale') {
                    runningBalance += tx.debit;
                } else {
                    runningBalance -= tx.credit;
                }
                return {...tx, balance: runningBalance};
            });

            setTransactions(chronologicalTransactions);
        }
    }, [customer, customerSales]);

    const handleSavePayment = (paymentData: PaymentFormData) => {
        if (!customer) return;

        if (transactionToEdit && transactionToEdit.type === 'Payment') {
            // Edit existing payment - MOCK
            const updatedTransactions = transactions.map(tx => 
                tx.id === transactionToEdit.id 
                ? { ...tx, credit: paymentData.amount, date: paymentData.paymentDate.toISOString(), paymentDetails: paymentData } 
                : tx
            );
            setTransactions(updatedTransactions);
            toast({ title: "Payment Updated", description: "The payment has been updated successfully." });
        } else {
            // Add new payment - MOCK
            const newPayment: Transaction = {
                id: `PAY-${Date.now()}`,
                date: paymentData.paymentDate.toISOString(),
                type: 'Payment',
                reference: `RECV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                debit: 0,
                credit: paymentData.amount,
                balance: 0, // Recalculated on display
                paymentDetails: paymentData
            };
            setTransactions([newPayment, ...transactions]);
            // In a real scenario, you would update customer balance in Firestore
            toast({ title: "Payment Added", description: "The payment has been recorded." });
        }

        setIsPaymentDialogOpen(false);
        setTransactionToEdit(null);
    }
    
    const handleEdit = (tx: Transaction) => {
        if (tx.type === 'Sale') {
            router.push(`/sales/${tx.id}`);
        } else {
            setTransactionToEdit(tx);
            setIsPaymentDialogOpen(true);
        }
    };

    const handleDelete = () => {
        if (!transactionToDelete) return;
        // This is a mock delete, will need firestore logic
        setTransactions(transactions.filter(tx => tx.id !== transactionToDelete.id));
        toast({ title: "Transaction Deleted", description: "The transaction has been removed." });
        setTransactionToDelete(null);
    }

    const getBalanceVariant = (balance: number): "default" | "secondary" | "destructive" => {
        if (balance > 0) return 'destructive';
        return 'default';
    }

    if (isCustomerLoading || areSalesLoading) {
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
                        Rs. {Math.abs(customer.balance).toLocaleString()}
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
                                            <DropdownMenuItem onSelect={() => handleEdit(tx)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
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
                    This will permanently delete the transaction with reference "{transactionToDelete?.reference}". This action cannot be undone.
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

    