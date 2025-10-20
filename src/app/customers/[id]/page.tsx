'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCustomers, getSales, type Customer, type Sale } from '@/lib/data';
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

export interface Transaction {
    id: string;
    date: string;
    type: 'Sale' | 'Payment';
    reference: string;
    debit: number;
    credit: number;
    balance: number;
    paymentDetails?: Omit<PaymentFormData, 'amount'>;
}

export default function CustomerLedgerPage() {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const customerId = params.id as string;

    useEffect(() => {
        Promise.all([getCustomers(), getSales()]).then(([allCustomers, allSales]) => {
            const currentCustomer = allCustomers.find(c => c.id === customerId);
            setCustomer(currentCustomer || null);

            if (currentCustomer) {
                const mockPayments = [
                    { id: 'PAY001', date: '2024-07-22T18:00:00Z', amount: 1000, paymentMethod: 'Cash' as const, notes: 'Advance for next service' },
                ];

                const salesTransactions: Transaction[] = allSales
                    .filter(s => s.customer.id === customerId)
                    .map(s => ({
                        id: s.id,
                        date: s.date,
                        type: 'Sale',
                        reference: s.invoice,
                        debit: s.total,
                        credit: 0,
                        balance: 0 // Will be calculated later
                    }));

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
                
                let runningBalance = currentCustomer.balance; // Start with the total balance
                // To calculate historical balance, we need to reverse the logic. Start from the oldest transaction.
                const reversedTx = [...allTransactions].reverse();
                const txsWithBalance = reversedTx.map(tx => {
                    let balanceBeforeTx = runningBalance;
                    if (tx.type === 'Sale') {
                        balanceBeforeTx = runningBalance - tx.debit;
                    } else { // Payment
                        balanceBeforeTx = runningBalance + tx.credit;
                    }
                    runningBalance = balanceBeforeTx;
                    return { ...tx, balance: balanceBeforeTx };
                }).reverse();


                // This is a simplified balance calculation for UI display.
                // A real implementation would require starting from an initial balance and calculating forward.
                let currentBalance = currentCustomer.balance;
                const finalTransactions = allTransactions.map(tx => {
                    const txWithBalance = {...tx, balance: currentBalance};
                    if (tx.type === 'Sale') {
                        currentBalance -= tx.debit;
                    } else {
                        currentBalance += tx.credit;
                    }
                    return txWithBalance;
                });
                
                setTransactions(finalTransactions);
            }
        });
    }, [customerId, toast]);

    const handleSavePayment = (paymentData: PaymentFormData) => {
        if (!customer) return;

        if (transactionToEdit && transactionToEdit.type === 'Payment') {
            // Edit existing payment
            const updatedTransactions = transactions.map(tx => 
                tx.id === transactionToEdit.id 
                ? { ...tx, credit: paymentData.amount, date: paymentData.paymentDate.toISOString(), paymentDetails: paymentData } 
                : tx
            );
            setTransactions(updatedTransactions);
            toast({ title: "Payment Updated", description: "The payment has been updated successfully." });
        } else {
            // Add new payment
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
            setCustomer({...customer, balance: customer.balance - paymentData.amount });
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

        setTransactions(transactions.filter(tx => tx.id !== transactionToDelete.id));
        toast({ title: "Transaction Deleted", description: "The transaction has been removed." });
        setTransactionToDelete(null);
    }

    const getBalanceVariant = (balance: number): "default" | "secondary" | "destructive" => {
        if (balance > 0) return 'destructive';
        return 'default';
    }

    if (!customer) {
        return <div className="p-8">Loading customer information...</div>;
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
