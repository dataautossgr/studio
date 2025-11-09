'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type Dealer, type Purchase, type DealerPayment, type BankAccount, type BankTransaction } from '@/lib/data';
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
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Printer } from 'lucide-react';
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
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, runTransaction, DocumentReference, DocumentSnapshot } from 'firebase/firestore';
import { useStoreSettings } from '@/context/store-settings-context';
import html2pdf from 'html2pdf.js';

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.433-9.89-9.889-9.89-5.452 0-9.887 4.434-9.889 9.89.001 2.235.652 4.395 1.877 6.26l-1.165 4.25zM12.001 5.804c-3.415 0-6.19 2.775-6.19 6.19 0 1.562.57 3.002 1.548 4.145l.123.187-.847 3.103 3.179-.834.175.107c1.109.676 2.378 1.034 3.692 1.034 3.414 0 6.189-2.775 6.189-6.19 0-3.414-2.775-6.189-6.189-6.189zm4.394 8.352c-.193.334-1.359 1.6-1.574 1.799-.217.199-.442.249-.668.149-.226-.1-.497-.199-.942-.374-1.23-.486-2.5-1.5-3.473-2.977-.643-1.025-1.02-2.19-1.123-2.541-.123-.42-.038-.65.099-.824.111-.149.249-.199.374-.249.123-.05.249-.05.374.05.175.149.324.448.424.598.125.149.149.224.05.374-.025.05-.05.074-.074.1-.025.025-.05.025-.074.05-.075.05-.125.125-.175.174-.05.05-.1.1-.125.149-.025.025-.05.05-.074.05-.025.025-.05.05-.05.074s-.025.05-.025.075c.025.05.05.1.074.124.025.025.05.05.075.075.25.224.5.474.75.724.324.324.6.574.85.749.075.05.15.075.225.1.074.025.149.025.224.025.075 0 .15-.025.2-.05.226-.075.451-.575.526-.649.075-.075.175-.125.274-.125s.174.025.249.05c.1.025.5.249.574.424s.1.275.025.399c-.075.125-.224.274-.324.374z"/>
    </svg>
);


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
    const { settings } = useStoreSettings();
    const printRef = useRef<HTMLDivElement>(null);

    const dealerId = params.id as string;

    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    const dealerRef = useMemoFirebase(() => dealerId && firestore ? doc(firestore, 'dealers', dealerId) : null, [firestore, dealerId]);
    const { data: dealer, isLoading: isDealerLoading } = useDoc<Dealer>(dealerRef);
    const bankAccountsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'my_bank_accounts') : null, [firestore]);
    const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsCollection);

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
            paymentDestinationDetails: (p as any).paymentDestinationDetails,
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
                // --- ALL READS MUST COME BEFORE WRITES ---
                const dealerDoc = await transaction.get(dealerRef);
                if (!dealerDoc.exists()) throw new Error("Dealer not found!");

                let oldPaymentDoc: DocumentSnapshot | null = null;
                if (transactionToEdit && transactionToEdit.type === 'Payment') {
                    const paymentRef = doc(firestore, 'dealer_payments', transactionToEdit.id);
                    oldPaymentDoc = await transaction.get(paymentRef);
                }

                let oldBankSnap: DocumentSnapshot | null = null;
                const oldOnlinePaymentSource = oldPaymentDoc?.data()?.onlinePaymentSource;
                if (oldPaymentDoc?.data()?.paymentMethod === 'Online' && oldOnlinePaymentSource) {
                    oldBankSnap = await transaction.get(doc(firestore, 'my_bank_accounts', oldOnlinePaymentSource));
                }
                
                let newBankSnap: DocumentSnapshot | null = null;
                if (paymentData.paymentMethod === 'Online' && paymentData.onlinePaymentSource) {
                    newBankSnap = await transaction.get(doc(firestore, 'my_bank_accounts', paymentData.onlinePaymentSource));
                }

                // --- ALL WRITES START FROM HERE ---
                const currentBalance = dealerDoc.data().balance || 0;
                const oldAmount = oldPaymentDoc?.data()?.amount || 0;

                const paymentPayload: Omit<DealerPayment, 'id' | 'dealer'> = {
                    amount: paymentData.amount,
                    date: paymentData.paymentDate.toISOString(),
                    paymentMethod: paymentData.paymentMethod,
                    onlinePaymentSource: paymentData.onlinePaymentSource || '',
                    receiptImageUrl: paymentData.receiptImageUrl || '',
                    notes: paymentData.notes || '',
                    paymentDestinationDetails: paymentData.paymentDestinationDetails || undefined,
                    reference: transactionToEdit?.reference || `PAID-${Date.now().toString().slice(-6)}`,
                };
                
                let paymentRef: DocumentReference;
                if (transactionToEdit && transactionToEdit.type === 'Payment') {
                    paymentRef = doc(firestore, 'dealer_payments', transactionToEdit.id);
                    const difference = paymentData.amount - oldAmount;
                    transaction.update(paymentRef, paymentPayload);
                    transaction.update(dealerRef, { balance: currentBalance - difference });
                } else {
                    paymentRef = doc(collection(firestore, 'dealer_payments'));
                    transaction.set(paymentRef, { ...paymentPayload, dealer: dealerRef });
                    if (paymentData.paymentMethod === 'Cash') {
                        // This payment will be picked up by the cash flow page automatically.
                    }
                    transaction.update(dealerRef, { balance: currentBalance - paymentData.amount });
                }

                // Revert old transaction if online source changed
                if (oldBankSnap?.exists() && oldOnlinePaymentSource !== paymentData.onlinePaymentSource) {
                    const oldBankRef = oldBankSnap.ref;
                    const oldBankBalance = oldBankSnap.data()?.balance || 0;
                    transaction.update(oldBankRef, { balance: oldBankBalance + oldAmount });
                }
                
                // Add new transaction if it's online
                if (paymentData.paymentMethod === 'Online' && paymentData.onlinePaymentSource) {
                    const newBankRef = newBankSnap?.ref;
                    if (newBankRef && newBankSnap?.exists()) {
                        const currentBankBalance = newBankSnap.data()?.balance || 0;
                        const amountToDebit = paymentData.amount - (oldOnlinePaymentSource === paymentData.onlinePaymentSource ? oldAmount : 0);

                         if (amountToDebit !== 0) {
                            const newBalance = currentBankBalance - amountToDebit;
                            transaction.update(newBankRef, { balance: newBalance });

                            const txRef = doc(collection(firestore, 'bank_transactions'));
                            const txPayload: Omit<BankTransaction, 'id'> = {
                                accountId: paymentData.onlinePaymentSource,
                                date: paymentData.paymentDate.toISOString(),
                                description: `Payment ${transactionToEdit ? 'update for' : 'to'} ${dealer.company}`,
                                type: 'Debit',
                                amount: amountToDebit,
                                balanceAfter: newBalance,
                                referenceId: paymentRef.id,
                                referenceType: 'Dealer Payment'
                            };
                            transaction.set(txRef, txPayload);
                        }
                    }
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
                
                const docToDeleteSnap = await transaction.get(ref);
                if(!docToDeleteSnap.exists()) throw new Error("Transaction to delete not found!");
                const docToDelete = docToDeleteSnap.data();

                const currentBalance = dealerDoc.data().balance || 0;
                let newBalance: number;
                
                if (transactionToDelete.type === 'Purchase') {
                    newBalance = currentBalance - transactionToDelete.debit;
                } else { // Payment
                    newBalance = currentBalance + transactionToDelete.credit;
                     if (docToDelete.paymentMethod === 'Online' && docToDelete.onlinePaymentSource) {
                        const bankRef = doc(firestore, 'my_bank_accounts', docToDelete.onlinePaymentSource);
                        const bankSnap = await transaction.get(bankRef);
                        if (bankSnap.exists()) {
                            const currentBankBalance = bankSnap.data().balance;
                            transaction.update(bankRef, { balance: currentBankBalance + docToDelete.amount });
                        }
                    }
                }

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

    const handlePrint = () => {
        const ledgerElement = printRef.current;
        if (ledgerElement) {
             const opt = {
                margin: 0.5,
                filename: `ledger-${dealer?.company || 'dealer'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(ledgerElement).save();
        }
    };

    const handleSendWhatsApp = () => {
        alert("Please 'Save as PDF' first, then send it via WhatsApp.");
        handlePrint();
        if (dealer?.phone) {
            const phone = dealer.phone.replace(/\D/g, ''); // Remove non-digits
            const message = encodeURIComponent(`Assalam-o-Alaikum ${dealer.company},\n\nAttached is your account ledger from ${settings.storeName}.\n\nThank you for your business!\nShukriya.`);
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        }
    };

    if (isDealerLoading || isLoading) {
        return <div className="p-8">Loading dealer information...</div>;
    }
    
    if (!dealer) {
        return <div className="p-8">Dealer not found.</div>;
    }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div ref={printRef} className="printable-content">
            <Card className="print:border-none print:shadow-none">
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

            <Card className="mt-8 print:border-none print:shadow-none">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Transaction Ledger</CardTitle>
                        <CardDescription>
                        History of all purchases and payments with {dealer.company}.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 no-print">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
                        </Button>
                        <Button onClick={handleSendWhatsApp}>
                            <WhatsAppIcon /> <span className="ml-2">Send on WhatsApp</span>
                        </Button>
                        <Button onClick={() => { setTransactionToEdit(null); setIsPaymentDialogOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Payment
                        </Button>
                    </div>
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
                                <TableHead className="no-print"><span className="sr-only">Actions</span></TableHead>
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
                                    <TableCell className="text-right no-print">
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
        </div>

        <PaymentDialog 
            isOpen={isPaymentDialogOpen}
            onClose={() => { setIsPaymentDialogOpen(false); setTransactionToEdit(null); }}
            onSave={handleSavePayment}
            dealerName={dealer.company}
            payment={transactionToEdit}
            bankAccounts={bankAccounts || []}
            isLoadingBankAccounts={isLoadingBankAccounts}
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
