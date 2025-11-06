'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';
import type { BankAccount } from '@/lib/data';

const bankAccountSchema = z.object({
  accountTitle: z.string().min(1, 'Account title is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().optional(),
  openingBalance: z.coerce.number().min(0, 'Balance must be a non-negative number'),
});

export type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface BankAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BankAccountFormData) => void;
  account: BankAccount | null;
}

export function BankAccountDialog({ isOpen, onClose, onSave, account }: BankAccountDialogProps) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
  });
  
  const isEditing = !!account;

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        reset({ ...account, openingBalance: account.balance }); // Use 'balance' for editing
      } else {
        reset({
          accountTitle: '',
          bankName: '',
          accountNumber: '',
          openingBalance: 0,
        });
      }
    }
  }, [isOpen, reset, account, isEditing]);

  const onSubmit = (data: BankAccountFormData) => {
    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Bank Account' : 'Add New Bank Account'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this account.' : 'Fill in the details for the new account.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="accountTitle">Account Title</Label>
                <Input id="accountTitle" {...register('accountTitle')} className={errors.accountTitle ? 'border-destructive' : ''} placeholder="e.g. Ameer Hamza"/>
                {errors.accountTitle && <p className="text-xs text-destructive mt-1">{errors.accountTitle.message}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="bankName">Bank / Service Name</Label>
                <Input id="bankName" {...register('bankName')} className={errors.bankName ? 'border-destructive' : ''} placeholder="e.g. Meezan Bank, Easypaisa"/>
                {errors.bankName && <p className="text-xs text-destructive mt-1">{errors.bankName.message}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number (Optional)</Label>
                <Input id="accountNumber" {...register('accountNumber')} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="openingBalance">Current / Opening Balance (Rs.)</Label>
                <Input id="openingBalance" type="number" {...register('openingBalance')} className={errors.openingBalance ? 'border-destructive' : ''} readOnly={isEditing} />
                {errors.openingBalance && <p className="text-xs text-destructive mt-1">{errors.openingBalance.message}</p>}
                {isEditing && <p className="text-xs text-muted-foreground">Balance can only be changed via transactions.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditing ? 'Save Changes' : 'Add Account'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
