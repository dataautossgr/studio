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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const bankAccounts = ["Meezan Bank", "Nayapay", "Sadapay", "Easypaisa", "Jazzcash", "Upaisa"];

const transactionSchema = z.object({
  fromAccount: z.string().min(1, "Source account is required"),
  toAccount: z.string().min(1, "Destination account is required"),
  amount: z.coerce.number().min(1, "Amount must be positive"),
  note: z.string().optional(),
}).refine(data => data.fromAccount !== data.toAccount, {
  message: "From and To accounts cannot be the same",
  path: ["toAccount"],
});


export type BankTransactionFormData = z.infer<typeof transactionSchema>;

interface BankTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BankTransactionFormData) => void;
}

export function BankTransactionDialog({ isOpen, onClose, onSave }: BankTransactionDialogProps) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<BankTransactionFormData>({
    resolver: zodResolver(transactionSchema),
  });
  

  useEffect(() => {
    if (isOpen) {
      reset({
        fromAccount: '',
        toAccount: '',
        amount: 0,
        note: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = (data: BankTransactionFormData) => {
    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Bank Transaction</DialogTitle>
          <DialogDescription>
            Record a transfer between cash and bank accounts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>From</Label>
                     <Controller
                        name="fromAccount"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select Source" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash Drawer">Cash Drawer</SelectItem>
                                    {bankAccounts.map(acc => <SelectItem key={acc} value={acc}>{acc}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                     {errors.fromAccount && <p className="text-xs text-destructive mt-1">{errors.fromAccount.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label>To</Label>
                    <Controller
                        name="toAccount"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select Destination" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash Drawer">Cash Drawer</SelectItem>
                                    {bankAccounts.map(acc => <SelectItem key={acc} value={acc}>{acc}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                     {errors.toAccount && <p className="text-xs text-destructive mt-1">{errors.toAccount.message}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="amount">Amount (Rs.)</Label>
                <Input id="amount" type="number" {...register('amount')} className={errors.amount ? 'border-destructive' : ''} />
                {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea id="note" {...register('note')} placeholder="e.g., Daily cash deposit" />
            </div>
            
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Transaction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
