
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
import { useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import type { Transaction } from './dealer-detail';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BankAccount } from '@/lib/data';


const paymentSchema = z.object({
  transactionType: z.enum(['Payment', 'Adjustment']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  paymentDate: z.date(),
  paymentMethod: z.enum(['Cash', 'Online', 'Cheque']).optional(),
  onlinePaymentSource: z.string().optional(),
  receiptImageUrl: z.string().optional(),
  notes: z.string().optional(),
  paymentDestinationDetails: z.object({
    accountTitle: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
  }).optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PaymentFormData) => void;
  dealerName: string;
  payment: Transaction | null;
  bankAccounts: BankAccount[];
  isLoadingBankAccounts: boolean;
  isReadOnly: boolean;
}

export function PaymentDialog({ isOpen, onClose, onSave, dealerName, payment, bankAccounts, isLoadingBankAccounts, isReadOnly }: PaymentDialogProps) {
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const transactionType = watch('transactionType');
  const paymentMethod = watch('paymentMethod');
  const receiptImageUrl = watch('receiptImageUrl');

  useEffect(() => {
    if (isOpen) {
      if (payment && payment.paymentDetails) {
        reset({
            ...payment.paymentDetails,
            amount: payment.type === 'Payment' ? payment.credit : payment.debit,
        });
      } else {
        reset({
            transactionType: 'Payment',
            amount: 0,
            paymentDate: new Date(),
            paymentMethod: 'Cash',
            onlinePaymentSource: '',
            receiptImageUrl: '',
            notes: '',
            paymentDestinationDetails: { accountTitle: '', bankName: '', accountNumber: '' },
        });
      }
    }
  }, [isOpen, reset, payment]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('receiptImageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: PaymentFormData) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? 'Transaction Details' : 'Add Transaction'} for {dealerName}</DialogTitle>
          <DialogDescription>
             {isReadOnly ? 'Details for the recorded transaction.' : 'Record a payment made to this dealer or manually adjust their balance.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset disabled={isReadOnly} className="grid gap-6 py-4">

            <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Controller
                    control={control}
                    name="transactionType"
                    defaultValue="Payment"
                    render={({ field }) => (
                        <RadioGroup 
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex gap-4 pt-2"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Payment" id="type-payment-d" />
                                <Label htmlFor="type-payment-d">Payment Made (Credit)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Adjustment" id="type-adjustment-d" />
                                <Label htmlFor="type-adjustment-d">Balance Adjustment (Debit)</Label>
                            </div>
                        </RadioGroup>
                    )}
                />
                <p className="text-xs text-muted-foreground">
                    'Payment' reduces what you owe. 'Adjustment' increases what you owe (e.g., for returns/opening balance).
                </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (Rs.)</Label>
              <Input id="amount" type="number" {...register('amount')} className={errors.amount ? 'border-destructive' : ''} />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
                <Label>Date</Label>
                <Controller
                    control={control}
                    name="paymentDate"
                    render={({ field }) => (
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button
                                  variant={"outline"}
                                  disabled={isReadOnly}
                                  className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                  )}
                              >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                          <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                          />
                          </PopoverContent>
                      </Popover>
                    )}
                />
            </div>
            
            {transactionType === 'Payment' && (
              <div className="space-y-4 border p-4 rounded-md">
                <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Controller
                        control={control}
                        name="paymentMethod"
                        defaultValue="Cash"
                        render={({ field }) => (
                            <RadioGroup 
                                value={field.value}
                                onValueChange={field.onChange}
                                className="flex gap-4 pt-2"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Cash" id="cash-d" />
                                    <Label htmlFor="cash-d">Cash</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Online" id="online-d" />
                                    <Label htmlFor="online-d">Online</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Cheque" id="cheque-d" />
                                    <Label htmlFor="cheque-d">Cheque</Label>
                                </div>
                            </RadioGroup>
                        )}
                    />
                </div>
                {paymentMethod === 'Online' && (
                <div className="grid md:grid-cols-2 gap-6 p-4 border rounded-md">
                    <div className="space-y-2">
                    <Label htmlFor="onlinePaymentSource">My Account (Source)</Label>
                    <Controller
                        name="onlinePaymentSource"
                        control={control}
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="onlinePaymentSource">
                            <SelectValue placeholder="Select my bank" />
                            </SelectTrigger>
                            <SelectContent>
                            {isLoadingBankAccounts ? <SelectItem value="loading" disabled>Loading...</SelectItem> : 
                            bankAccounts.map(account => (
                                <SelectItem key={account.id} value={account.id}>
                                {account.bankName} ({account.accountTitle})
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        )}
                    />
                    </div>
                    <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Dealer's Account (Destination)</h4>
                    <div className="space-y-2">
                        <Label htmlFor="dest-title" className="text-xs">Account Title</Label>
                        <Input id="dest-title" {...register('paymentDestinationDetails.accountTitle')} placeholder="e.g. Qureshi Autos"/>
                    </div>
                        <div className="space-y-2">
                        <Label htmlFor="dest-bank" className="text-xs">Bank Name</Label>
                        <Input id="dest-bank" {...register('paymentDestinationDetails.bankName')} placeholder="e.g. HBL"/>
                    </div>
                        <div className="space-y-2">
                        <Label htmlFor="dest-acc" className="text-xs">Account Number (Optional)</Label>
                        <Input id="dest-acc" {...register('paymentDestinationDetails.accountNumber')} placeholder="e.g. PK..."/>
                    </div>
                    </div>
                </div>
                )}
                {(paymentMethod === 'Online' || paymentMethod === 'Cheque') && (
                <div className="space-y-2">
                    <Label htmlFor="receipt-upload">
                    {paymentMethod === 'Online' ? 'Upload Receipt (Optional)' : 'Upload Cheque Image (Optional)'}
                    </Label>
                    <div className="flex items-center gap-4">
                    {receiptImageUrl ? (
                        <Image
                            src={receiptImageUrl}
                            alt="Receipt preview"
                            width={64}
                            height={64}
                            className="rounded-md aspect-square object-cover"
                        />
                    ) : (
                        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                    )}
                    <Input id="receipt-upload" type="file" accept="image/*" onChange={handleImageChange} className="text-xs" disabled={isReadOnly}/>
                    </div>
                </div>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register('notes')} placeholder="Optional payment notes or reference..." />
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            {!isReadOnly && <Button type="submit">Save Transaction</Button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
