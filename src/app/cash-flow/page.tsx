'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle, Banknote, Landmark } from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  date: Date;
  type: 'Sale' | 'Purchase' | 'Expense' | 'Payment Received' | 'Payment Made';
  description: string;
  cashAmount: number;
  bankAmount: number;
}

const mockTransactions: Transaction[] = [
  { id: '1', date: new Date('2024-07-23T10:00:00Z'), type: 'Sale', description: 'INV-2024-003 - Usman Autos', cashAmount: 1450, bankAmount: 0 },
  { id: '2', date: new Date('2024-07-23T11:30:00Z'), type: 'Expense', description: 'Utility Bills - LESCO', cashAmount: -3500, bankAmount: 0 },
  { id: '3', date: new Date('2024-07-22T14:00:00Z'), type: 'Payment Received', description: 'From Zahid Pervaiz for INV-2024-004', cashAmount: 3000, bankAmount: 0 },
  { id: '4', date: new Date('2024-07-22T16:00:00Z'), type: 'Purchase', description: 'BT-0123 - Butt Auto Store', cashAmount: 0, bankAmount: -8000 },
  { id: '5', date: new Date('2024-07-21T09:00:00Z'), type: 'Payment Made', description: 'To Nadeem & Sons Trading', cashAmount: 0, bankAmount: -50000 },
  { id: '6', date: new Date('2024-07-21T18:00:00Z'), type: 'Sale', description: 'INV-2024-002 - Walk-in Customer', cashAmount: 0, bankAmount: 6000 },
];

export default function CashFlowPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    // In a real app, you would fetch and combine data from sales, purchases, expenses, etc.
    const sortedTransactions = mockTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
    setTransactions(sortedTransactions);
  }, []);

  const { cashInHand, bankBalance, transactionsWithBalance } = (() => {
    let runningCash = 50000; // Starting cash
    let runningBank = 200000; // Starting bank balance

    const transactionsWithBalance = [...transactions].reverse().map(tx => {
        runningCash += tx.cashAmount;
        runningBank += tx.bankAmount;
        return { ...tx, runningCash, runningBank };
    }).reverse();

    const currentCash = transactionsWithBalance[0]?.runningCash ?? runningCash;
    const currentBank = transactionsWithBalance[0]?.runningBank ?? runningBank;

    return { 
        cashInHand: currentCash, 
        bankBalance: currentBank,
        transactionsWithBalance
    };
  })();

  const getTransactionTypeDetails = (type: Transaction['type']): { variant: 'secondary' | 'outline' | 'destructive', icon: React.ElementType } => {
    switch (type) {
        case 'Sale':
        case 'Payment Received':
            return { variant: 'secondary', icon: ArrowUpCircle };
        case 'Purchase':
        case 'Expense':
        case 'Payment Made':
            return { variant: 'destructive', icon: ArrowDownCircle };
        default:
            return { variant: 'outline', icon: Banknote };
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cash Flow</h1>
          <p className="text-muted-foreground">
            Track all your cash and bank account movements.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash in Hand</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {cashInHand.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current available cash balance.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {bankBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Aggregated balance of all bank accounts.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>A unified ledger of all cash and bank transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Cash Flow</TableHead>
                <TableHead className="text-right">Bank Flow</TableHead>
                <TableHead className="text-right">Cash Balance</TableHead>
                <TableHead className="text-right">Bank Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionsWithBalance.map((tx) => {
                const { variant, icon: Icon } = getTransactionTypeDetails(tx.type);
                const isIncome = tx.cashAmount > 0 || tx.bankAmount > 0;
                return (
                    <TableRow key={tx.id}>
                        <TableCell>{format(tx.date, 'dd MMM, yyyy')}</TableCell>
                        <TableCell>
                            <Badge variant={variant} className="gap-1">
                                <Icon className="h-3.5 w-3.5" />
                                {tx.type}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-medium max-w-xs truncate">{tx.description}</TableCell>
                        <TableCell className={`text-right font-mono ${tx.cashAmount > 0 ? 'text-green-600' : tx.cashAmount < 0 ? 'text-destructive' : ''}`}>
                            {tx.cashAmount !== 0 ? `Rs. ${tx.cashAmount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${tx.bankAmount > 0 ? 'text-green-600' : tx.bankAmount < 0 ? 'text-destructive' : ''}`}>
                            {tx.bankAmount !== 0 ? `Rs. ${tx.bankAmount.toLocaleString()}`: '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">{`Rs. ${tx.runningCash.toLocaleString()}`}</TableCell>
                        <TableCell className="text-right font-mono">{`Rs. ${tx.runningBank.toLocaleString()}`}</TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
