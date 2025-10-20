'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
import { PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentDialog } from './payment-dialog';

interface Transaction {
    date: string;
    type: 'Sale' | 'Payment';
    reference: string;
    debit: number;
    credit: number;
    balance: number;
}

export default function CustomerLedgerPage() {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    
    const params = useParams();
    const customerId = params.id as string;

    useEffect(() => {
        Promise.all([getCustomers(), getSales()]).then(([allCustomers, allSales]) => {
            const currentCustomer = allCustomers.find(c => c.id === customerId);
            setCustomer(currentCustomer || null);

            if (currentCustomer) {
                // Mock payments for ledger
                const mockPayments = [
                    { date: '2024-07-22T18:00:00Z', amount: 1000 },
                ];

                const sales = allSales
                    .filter(s => s.customer.id === customerId)
                    .map(s => ({
                        date: s.date,
                        type: 'Sale' as const,
                        reference: s.invoice,
                        debit: s.total,
                        credit: 0
                    }));

                const payments = mockPayments.map((p, i) => ({
                    date: p.date,
                    type: 'Payment' as const,
                    reference: `RECV-00${i + 1}`,
                    debit: 0,
                    credit: p.amount
                }));
                
                const allTransactions = [...sales, ...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                let runningBalance = currentCustomer.balance;
                const transactionsWithBalance = allTransactions.map(tx => {
                    const balance = runningBalance;
                    if (tx.type === 'Sale') {
                        runningBalance += tx.debit;
                    } else {
                        runningBalance -= tx.credit;
                    }
                    return { ...tx, balance };
                }).reverse();
                
                setTransactions(transactionsWithBalance.reverse());
            }
        });
    }, [customerId]);

    const handleSavePayment = (amount: number) => {
        if (!customer) return;

        const newPayment: Transaction = {
            date: new Date().toISOString(),
            type: 'Payment',
            reference: `RECV-${Date.now()}`,
            debit: 0,
            credit: amount,
            balance: customer.balance - amount // This is a simplified calculation for the UI
        }
        setTransactions([newPayment, ...transactions]);
        setCustomer({...customer, balance: customer.balance - amount });
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
                                    <Badge variant={tx.type === 'Sale' ? 'outline' : 'secondary'}>
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
            customerName={customer.name}
        />
    </div>
  );
}
