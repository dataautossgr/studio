'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
import { PlusCircle, Receipt, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentDialog } from './payment-dialog';

interface Transaction {
    date: string;
    type: 'Purchase' | 'Payment';
    reference: string;
    debit: number;
    credit: number;
    balance: number;
}

export default function DealerLedgerPage() {
    const [dealer, setDealer] = useState<Dealer | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    
    const params = useParams();
    const dealerId = params.id as string;

    useEffect(() => {
        Promise.all([getDealers(), getPurchases()]).then(([allDealers, allPurchases]) => {
            const currentDealer = allDealers.find(d => d.id === dealerId);
            setDealer(currentDealer || null);

            if (currentDealer) {
                // Mock payments for ledger
                const mockPayments = [
                    { date: '2024-07-19T18:00:00Z', amount: 50000 },
                    { date: '2024-07-20T12:00:00Z', amount: 5000 },
                ];

                const purchases = allPurchases
                    .filter(p => p.dealer.id === dealerId)
                    .map(p => ({
                        date: p.date,
                        type: 'Purchase' as const,
                        reference: p.invoiceNumber,
                        debit: p.total,
                        credit: 0
                    }));

                const payments = mockPayments.map((p, i) => ({
                    date: p.date,
                    type: 'Payment' as const,
                    reference: `PAY-00${i + 1}`,
                    debit: 0,
                    credit: p.amount
                }));
                
                const allTransactions = [...purchases, ...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                let runningBalance = currentDealer.balance;
                const transactionsWithBalance = allTransactions.map(tx => {
                    const balance = runningBalance;
                    if (tx.type === 'Purchase') {
                        runningBalance += tx.debit;
                    } else {
                        runningBalance -= tx.credit;
                    }
                    return { ...tx, balance };
                }).reverse();
                
                setTransactions(transactionsWithBalance.reverse());
            }
        });
    }, [dealerId]);

    const handleSavePayment = (amount: number) => {
        // In a real app, you'd save this payment and update the dealer's balance.
        // For now, we just add it to the local state for demonstration.
        if (!dealer) return;

        const newPayment: Transaction = {
            date: new Date().toISOString(),
            type: 'Payment',
            reference: `PAY-${Date.now()}`,
            debit: 0,
            credit: amount,
            balance: dealer.balance - amount // This is a simplified calculation for the UI
        }
        setTransactions([newPayment, ...transactions]);
        setDealer({...dealer, balance: dealer.balance - amount });
    }

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
                <Button onClick={() => setIsPaymentDialogOpen(true)}>
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx, index) => (
                            <TableRow key={index}>
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
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
         </Card>

        <PaymentDialog 
            isOpen={isPaymentDialogOpen}
            onClose={() => setIsPaymentDialogOpen(false)}
            onSave={handleSavePayment}
            dealerName={dealer.company}
        />
    </div>
  );
}
