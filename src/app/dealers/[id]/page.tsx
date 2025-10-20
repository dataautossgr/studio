'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDealers, getPurchases, type Dealer, type Purchase } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import type { PaymentFormData } from './payment-dialog';
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
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export interface Transaction {
    id: string;
    date: string;
    type: 'Purchase' | 'Payment';
    reference: string;
    debit: number;
    credit: number;
    balance: number;
    paymentDetails?: Omit<PaymentFormData, 'amount'>;
}

export default function DealerLedgerPage() {
    const [dealer, setDealer] = useState<Dealer | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const dealerId = params.id as string;

    useEffect(() => {
        Promise.all([getDealers(), getPurchases()]).then(([allDealers, allPurchases]) => {
            const currentDealer = allDealers.find(d => d.id === dealerId);
            setDealer(currentDealer || null);

            if (currentDealer) {
                const mockPayments = [
                    { id: 'PAY-DLR-001', date: '2024-07-19T18:00:00Z', amount: 50000, paymentMethod: 'Bank Transfer' as const, notes: 'Payment for invoice NS-9812' },
                    { id: 'PAY-DLR-002', date: '2024-07-20T12:00:00Z', amount: 5000, paymentMethod: 'Cash' as const, notes: '' },
                ];

                const purchases: Transaction[] = allPurchases
                    .filter(p => p.dealer.id === dealerId)
                    .map(p => ({
                        id: p.id,
                        date: p.date,
                        type: 'Purchase' as const,
                        reference: p.invoiceNumber,
                        debit: p.total,
                        credit: 0,
                        balance: 0 // to be calculated
                    }));

                const payments: Transaction[] = mockPayments.map((p, i) => ({
                    id: p.id,
                    date: p.date,
                    type: 'Payment' as const,
                    reference: `PAY-00${i + 1}`,
                    debit: 0,
                    credit: p.amount,
                    balance: 0, // to be calculated
                    paymentDetails: {
                      paymentDate: new Date(p.date),
                      paymentMethod: p.paymentMethod,
                      notes: p.notes,
                    }
                }));
                
                const allTransactions = [...purchases, ...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                // This is a simplified balance calculation for UI display.
                let runningBalance = currentDealer.balance;
                const transactionsWithBalance = allTransactions.map(tx => {
                    const txWithBalance = {...tx, balance: runningBalance};
                    if (tx.type === 'Purchase') {
                        runningBalance -= tx.debit;
                    } else { // Payment
                        runningBalance += tx.credit;
                    }
                    return txWithBalance;
                });
                
                setTransactions(transactionsWithBalance);
            }
        });
    }, [dealerId]);

    const handleSavePayment = (paymentData: PaymentFormData) => {
        if (!dealer) return;

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
                id: `PAY-DLR-${Date.now()}`,
                date: new Date().toISOString(),
                type: 'Payment',
                reference: `PAY-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                debit: 0,
                credit: paymentData.amount,
                balance: 0, // Recalculate
                paymentDetails: paymentData,
            };
            setTransactions([newPayment, ...transactions]);
            setDealer({...dealer, balance: dealer.balance - paymentData.amount });
             toast({ title: "Payment Added", description: "The payment to the dealer has been recorded." });
        }

        setIsPaymentDialogOpen(false);
        setTransactionToEdit(null);
    }
    
    const handleEdit = (tx: Transaction) => {
        if (tx.type === 'Purchase') {
            router.push(`/purchase/${tx.id}`);
        } else {
            setTransactionToEdit(tx);
            setIsPaymentDialogOpen(true);
        }
    };

    const handleDelete = () => {
        if (!transactionToDelete) return;
        setTransactions(transactions.filter(tx => tx.id !== transactionToDelete.id));
        toast({ title: "Transaction Deleted", description: "The transaction has been removed from the ledger." });
        setTransactionToDelete(null);
    };

    const getBalanceVariant = (balance: number): "default" | "secondary" | "destructive" => {
        if (balance > 0) return 'destructive'; // We owe the dealer
        if (balance < 0) return 'secondary'; // Dealer owes us (advance)
        return 'default';
    }

    if (!dealer) {
        return <div className="p-8">Loading dealer information...</div>;
    }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-2xl">{dealer.company}</CardTitle>
                    <CardDescription>{dealer.name} - {dealer.phone}</CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <Badge variant={getBalanceVariant(dealer.balance)} className="text-xl font-mono">
                        Rs. {Math.abs(dealer.balance).toLocaleString()}
                    </Badge>
                </div>
            </CardHeader>
        </Card>

         <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Transaction Ledger</CardTitle>
                    <CardDescription>
                    History of all purchases and payments with {dealer.company}.
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
                                    <Badge variant={tx.type === 'Purchase' ? 'outline' : 'secondary'}>
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
            dealerName={dealer.company}
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
