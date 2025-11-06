'use client';
import { useState } from 'react';
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
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
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
import { useCollection, useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { BankAccount } from '@/lib/data';
import { BankAccountDialog, type BankAccountFormData } from './bank-account-dialog';

export default function MyBanksPage() {
  const firestore = useFirestore();
  const myBanksCollection = useMemoFirebase(() => firestore ? collection(firestore, 'my_bank_accounts') : null, [firestore]);
  const { data: bankAccounts, isLoading } = useCollection<BankAccount>(myBanksCollection);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const { toast } = useToast();
  
  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsDialogOpen(true);
  };
  
  const handleEditAccount = (account: BankAccount) => {
    setSelectedAccount(account);
    setIsDialogOpen(true);
  };

  const handleSaveAccount = (formData: BankAccountFormData) => {
    if (!firestore) return;

    if (selectedAccount) {
      // Update existing account
      const accountRef = doc(firestore, 'my_bank_accounts', selectedAccount.id);
      const updatedData: Partial<BankAccount> = {
        accountTitle: formData.accountTitle,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        balance: formData.openingBalance // Assuming we are resetting balance on edit
      };
      setDocumentNonBlocking(accountRef, updatedData, { merge: true });
      toast({ title: "Success", description: "Account updated successfully." });
    } else {
      // Add new account
      const newAccount: Omit<BankAccount, 'id'> = {
        accountTitle: formData.accountTitle,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        balance: formData.openingBalance,
      };
      addDocumentNonBlocking(collection(firestore, 'my_bank_accounts'), newAccount);
      toast({ title: "Success", description: "New account added successfully." });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteAccount = () => {
    if (!accountToDelete || !firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'my_bank_accounts', accountToDelete.id));
    toast({ title: "Account Deleted", description: "The bank account has been removed." });
    setAccountToDelete(null);
  };

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
          <Button onClick={handleAddAccount}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Account
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Title</TableHead>
                <TableHead>Bank / Service Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading accounts...</TableCell>
                </TableRow>
              )}
              {!isLoading && bankAccounts?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No bank accounts added yet.
                  </TableCell>
                </TableRow>
              )}
              {bankAccounts?.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.accountTitle}</TableCell>
                  <TableCell>{account.bankName}</TableCell>
                  <TableCell>{account.accountNumber || 'N/A'}</TableCell>
                  <TableCell className="text-right font-mono">Rs. {account.balance.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => handleEditAccount(account)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onSelect={() => setAccountToDelete(account)}
                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                        >
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
      
       <BankAccountDialog 
            isOpen={isDialogOpen} 
            onClose={() => setIsDialogOpen(false)}
            onSave={handleSaveAccount}
            account={selectedAccount}
        />
        
        <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the account "{accountToDelete?.accountTitle} - {accountToDelete?.bankName}". This action cannot be undone.
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
