'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type Dealer, type Purchase, type DealerPayment } from '@/lib/data';
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
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, runTransaction, DocumentReference } from 'firebase/firestore';


export interface Transaction {
    id: string;
    date: string;
    type: 'Purchase' | 'Payment';
    reference: string;
    debit: number;
    credit: number;
    balance: number;
    paymentDetails?: Omit<PaymentFormData, 'amount'> & { receiptImageUrl?: string };
}

interface DealerLedgerDetailProps {
    dealerPurchases: Purchase[] | null;
    dealerPayments: DealerPayment[] | null;
    isLoading: boolean;
}

export default function DealerLedgerDetail({ dealerPurchases, dealerPayments, isLoading }: DealerLedgerDetailProps) {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const dealerId = params.id as string;

    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    const dealerRef = useMemoFirebase(() => dealerId && firestore ? doc(firestore, 'dealers', dealerId) : null, [firestore, dealerId]);
    const { data: dealer, isLoading: isDealerLoading } = useDoc<Dealer>(dealerRef);

    useEffect(() => {
      const validDealerPayments = dealerPayments || [];

      if (dealerPurchases && dealer) {
        const purchaseTransactions: Transaction[] = dealerPurchases.map(p => ({
          id: p.id,
          date: p.date,
          type: 'Purchase',
          reference: p.invoiceNumber,
          debit: p.total,
          credit: 0,
          balance: 0,
        }));
        
        const paymentTransactions: Transaction[] = validDealerPayments.map(p => ({
          id: p.id,
          date: p.date,
          type: 'Payment',
          reference: p.reference || `PAY-DLR-${p.id.substring(0,6)}`,
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
        
        const allTransactions = [...purchaseTransactions, ...paymentTransactions]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const totalCredits = allTransactions.reduce((sum, tx) => sum + tx.credit, 0);
        const totalDebits = allTransactions.reduce((sum, tx) => sum + tx.debit, 0);
        let startingBalance = dealer.balance - totalDebits + totalCredits;
        
        const finalTransactions = allTransactions.map(tx => {
          startingBalance += tx.debit - tx.credit;
          return { ...tx, balance: startingBalance };
        });
        
        setTransactions(finalTransactions.reverse());
      }
    }, [dealerPurchases, dealerPayments, dealer]);


    const handleSavePayment = async (paymentData: PaymentFormData) => {
        if (!dealerRef || !firestore || !dealer) return;

        try {
            await runTransaction(firestore, async (transaction) => {
                const dealerDoc = await transaction.get(dealerRef);
                if (!dealerDoc.exists()) throw new Error("Dealer not found!");

                let oldAmount = 0;
                if (transactionToEdit && transactionToEdit.type === 'Payment') {
                    const paymentRef = doc(firestore, 'dealer_payments', transactionToEdit.id);
                    const oldPaymentDoc = await transaction.get(paymentRef);
                    if (oldPaymentDoc.exists()) oldAmount = oldPaymentDoc.data().amount || 0;
                }

                const currentBalance = dealerDoc.data().balance || 0;
                const paymentPayload = {
                    amount: paymentData.amount,
                    date: paymentData.paymentDate.toISOString(),
                    paymentMethod: paymentData.paymentMethod,
                    onlinePaymentSource: paymentData.onlinePaymentSource || '',
                    notes: paymentData.notes || '',
                    receiptImageUrl: paymentData.receiptImageUrl || '',
                };
                
                if (transactionToEdit && transactionToEdit.type === 'Payment') {
                    const paymentRef = doc(firestore, 'dealer_payments', transactionToEdit.id);
                    const difference = paymentData.amount - oldAmount;
                    transaction.update(paymentRef, paymentPayload);
                    transaction.update(dealerRef, { balance: currentBalance - difference });
                } else {
                    const newPaymentRef = doc(collection(firestore, 'dealer_payments'));
                    const newPayment: Omit<DealerPayment, 'id'> = {
                        ...paymentPayload,
                        dealer: dealerRef,
                        reference: `PAID-${Date.now().toString().slice(-6)}`,
                    };
                    transaction.set(newPaymentRef, newPayment);
                    transaction.update(dealerRef, { balance: currentBalance - paymentData.amount });
                }
            });

            toast({ title: transactionToEdit ? "Payment Updated" : "Payment Added", description: `The payment to ${dealer.company} has been recorded.` });
        } catch (error) {
            console.error("Payment transaction failed: ", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save the payment." });
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

    const handleDelete = async () => {
        if (!transactionToDelete || !dealerRef || !firestore) return;

        try {
             await runTransaction(firestore, async (transaction) => {
                const dealerDoc = await transaction.get(dealerRef);
                if (!dealerDoc.exists()) throw new Error("Dealer not found!");
                
                const collectionName = transactionToDelete.type === 'Purchase' ? 'purchases' : 'dealer_payments';
                const ref = doc(firestore, collectionName, transactionToDelete.id);
                
                const docToDelete = await transaction.get(ref);
                if(!docToDelete.exists()) throw new Error("Transaction to delete not found!");

                const currentBalance = dealerDoc.data().balance || 0;
                let amount = transactionToDelete.type === 'Purchase' ? transactionToDelete.debit : transactionToDelete.credit;
                
                const newBalance = transactionToDelete.type === 'Purchase' ? currentBalance - amount : currentBalance + amount;

                transaction.update(dealerRef, { balance: newBalance });
                transaction.delete(ref);
             });

             toast({ title: "Transaction Deleted", description: "The transaction has been removed and balance updated." });
        } catch (error) {
             console.error("Delete transaction failed: ", error);
             toast({ variant: "destructive", title: "Error", description: "Could not delete the transaction." });
        }

        setTransactionToDelete(null);
    };

    const getBalanceVariant = (balance: number): "default" | "secondary" | "destructive" => {
        if (balance > 0) return 'destructive'; // We owe the dealer
        if (balance < 0) return 'secondary'; // Dealer owes us (advance)
        return 'default';
    }

    if (isDealerLoading || isLoading) {
        return <div className="p-8">Loading dealer information...</div>;
    }
    
    if (!dealer) {
        return <div className="p-8">Dealer not found.</div>;
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
