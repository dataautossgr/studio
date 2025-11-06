'use client';
import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Trash2,
  ArrowRightLeft,
  ChevronDown,
} from 'lucide-react';
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, addDoc, setDoc, query, where, writeBatch } from 'firebase/firestore';
import type { BankAccount, BankTransaction } from '@/lib/data';
import { BankAccountDialog, type BankAccountFormData } from './bank-account-dialog';
import { BankTransactionDialog, type BankTransactionFormData } from './bank-transaction-dialog';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function MyBanksPage() {
  const firestore = useFirestore();
  const myBanksCollection = useMemoFirebase(() => firestore ? collection(firestore, 'my_bank_accounts') : null, [firestore]);
  const transactionsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'bank_transactions') : null, [firestore]);

  const { data: bankAccounts, isLoading: isLoadingAccounts } = useCollection<BankAccount>(myBanksCollection);
  const { data: allTransactions, isLoading: isLoadingTransactions } = useCollection<BankTransaction>(transactionsCollection);

  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const { toast } = useToast();
  
  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsAccountDialogOpen(true);
  };
  
  const handleEditAccount = (account: BankAccount) => {
    setSelectedAccount(account);
    setIsAccountDialogOpen(true);
  };

  const handleSaveAccount = async (formData: BankAccountFormData) => {
    if (!firestore) return;
    const isEditing = !!selectedAccount;

    try {
      await runTransaction(firestore, async (transaction) => {
        if (isEditing) {
          const accountRef = doc(firestore, 'my_bank_accounts', selectedAccount!.id);
          const updatedData: Partial<BankAccount> = {
            accountTitle: formData.accountTitle,
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
          };
          transaction.update(accountRef, updatedData);
        } else {
          const newAccountRef = doc(collection(firestore, 'my_bank_accounts'));
          const newAccount: Omit<BankAccount, 'id'> = {
            accountTitle: formData.accountTitle,
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            balance: formData.openingBalance,
          };
          transaction.set(newAccountRef, newAccount);

          if (formData.openingBalance > 0) {
            const newTransactionRef = doc(collection(firestore, 'bank_transactions'));
            const newTransaction: Omit<BankTransaction, 'id'> = {
              accountId: newAccountRef.id,
              date: new Date().toISOString(),
              description: 'Opening Balance',
              type: 'Credit',
              amount: formData.openingBalance,
              balanceAfter: formData.openingBalance,
              referenceType: 'Manual'
            };
            transaction.set(newTransactionRef, newTransaction);
          }
        }
      });
      toast({ title: "Success", description: `Account has been ${isEditing ? 'updated' : 'added'} successfully.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save bank account.' });
      console.error(e);
    }
    setIsAccountDialogOpen(false);
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete || !firestore) return;
    
    // Check for associated transactions
    const accountTransactions = allTransactions?.filter(t => t.accountId === accountToDelete.id) || [];
    if (accountTransactions.length > 0) {
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Cannot delete account with existing transactions. Clear transaction history first.',
            duration: 5000,
        });
        setAccountToDelete(null);
        return;
    }

    await setDoc(doc(firestore, 'my_bank_accounts', accountToDelete.id), { balance: -1 }); // Mark for deletion or handle differently
    toast({ title: "Account Deleted", description: "The bank account has been removed." });
    setAccountToDelete(null);
  };

  const handleSaveTransaction = async (data: BankTransactionFormData) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);

    try {
      // Debit Transaction
      if (data.fromAccount) {
        const fromAccount = bankAccounts?.find(a => a.id === data.fromAccount);
        if (!fromAccount) throw new Error('Source account not found');
        const fromAccRef = doc(firestore, 'my_bank_accounts', fromAccount.id);
        const newFromBalance = fromAccount.balance - data.amount;

        batch.update(fromAccRef, { balance: newFromBalance });
        const fromTx: Omit<BankTransaction, 'id'> = {
          accountId: fromAccount.id,
          date: new Date().toISOString(),
          description: data.note || `Transfer to ${bankAccounts?.find(a => a.id === data.toAccount)?.bankName}`,
          type: 'Debit',
          amount: data.amount,
          balanceAfter: newFromBalance,
          referenceType: 'Manual',
        };
        batch.set(doc(collection(firestore, 'bank_transactions')), fromTx);
      }

      // Credit Transaction
      if (data.toAccount) {
        const toAccount = bankAccounts?.find(a => a.id === data.toAccount);
        if (!toAccount) throw new Error('Destination account not found');
        const toAccRef = doc(firestore, 'my_bank_accounts', toAccount.id);
        const newToBalance = toAccount.balance + data.amount;

        batch.update(toAccRef, { balance: newToBalance });
        const toTx: Omit<BankTransaction, 'id'> = {
          accountId: toAccount.id,
          date: new Date().toISOString(),
          description: data.note || `Transfer from ${bankAccounts?.find(a => a.id === data.fromAccount)?.bankName}`,
          type: 'Credit',
          amount: data.amount,
          balanceAfter: newToBalance,
          referenceType: 'Manual',
        };
        batch.set(doc(collection(firestore, 'bank_transactions')), toTx);
      }

      await batch.commit();
      toast({ title: 'Transaction Recorded', description: 'Bank balances have been updated.' });
      setIsTransactionDialogOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to record transaction.' });
      console.error(e);
    }
  };

  const isLoading = isLoadingAccounts || isLoadingTransactions;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Bank Accounts</CardTitle>
            <CardDescription>
              Manage your business bank accounts and online wallets.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsTransactionDialogOpen(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
            <Button onClick={handleAddAccount}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {isLoading && <p>Loading accounts...</p>}
            {!isLoading && bankAccounts?.filter(acc => acc.balance !== -1).map(account => (
              <AccordionItem value={account.id} key={account.id}>
                 <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4 items-center">
                      <div className="text-left">
                        <p className="font-semibold">{account.accountTitle}</p>
                        <p className="text-sm text-muted-foreground">{account.bankName} - {account.accountNumber || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <Badge variant={account.balance < 0 ? 'destructive' : 'secondary'} className="font-mono text-lg">Rs. {account.balance.toLocaleString()}</Badge>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onSelect={() => handleEditAccount(account)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setAccountToDelete(account)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                    </div>
                 </AccordionTrigger>
                <AccordionContent>
                   <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allTransactions?.filter(t => t.accountId === account.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                          <TableRow key={tx.id}>
                            <TableCell>{format(new Date(tx.date), 'dd MMM, yy, hh:mm a')}</TableCell>
                            <TableCell>{tx.description}</TableCell>
                            <TableCell className="text-right font-mono">{tx.type === 'Debit' ? `Rs. ${tx.amount.toLocaleString()}` : '-'}</TableCell>
                            <TableCell className="text-right font-mono text-green-600">{tx.type === 'Credit' ? `Rs. ${tx.amount.toLocaleString()}` : '-'}</TableCell>
                            <TableCell className="text-right font-mono">Rs. {tx.balanceAfter.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                   </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      
       <BankAccountDialog 
            isOpen={isAccountDialogOpen} 
            onClose={() => setIsAccountDialogOpen(false)}
            onSave={handleSaveAccount}
            account={selectedAccount}
        />
        
        <BankTransactionDialog
          isOpen={isTransactionDialogOpen}
          onClose={() => setIsTransactionDialogOpen(false)}
          onSave={handleSaveTransaction}
          accounts={bankAccounts || []}
        />
        
        <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    You can only delete an account if it has no transaction history. This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
