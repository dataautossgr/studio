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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import type { Transaction } from './page';

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  paymentDate: z.date(),
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'Cheque']),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PaymentFormData) => void;
  dealerName: string;
  payment: Transaction | null;
}

export function PaymentDialog({ isOpen, onClose, onSave, dealerName, payment }: PaymentDialogProps) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const isEditing = !!payment;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && payment?.paymentDetails) {
        reset({
            amount: payment.credit,
            paymentDate: new Date(payment.date),
            paymentMethod: payment.paymentDetails.paymentMethod,
            notes: payment.paymentDetails.notes
        });
      } else {
        reset({
            amount: 0,
            paymentDate: new Date(),
            paymentMethod: 'Cash',
            notes: '',
        });
      }
    }
  }, [isOpen, reset, payment, isEditing]);

  const onSubmit = (data: PaymentFormData) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} Payment for {dealerName}</DialogTitle>
          <DialogDescription>
             {isEditing ? 'Update the details of this payment.' : 'Record a payment made to this dealer.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (Rs.)</Label>
              <Input id="amount" type="number" {...register('amount')} className={errors.amount ? 'border-destructive' : ''} />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
                <Label>Payment Date</Label>
                <Controller
                    control={control}
                    name="paymentDate"
                    render={({ field }) => (
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button
                                  variant={"outline"}
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
                                <RadioGroupItem value="Cash" id="cash" />
                                <Label htmlFor="cash">Cash</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Bank Transfer" id="bank" />
                                <Label htmlFor="bank">Bank Transfer</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Cheque" id="cheque" />
                                <Label htmlFor="cheque">Cheque</Label>
                            </div>
                        </RadioGroup>
                    )}
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register('notes')} placeholder="Optional payment notes or reference..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditing ? 'Save Changes' : 'Save Payment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
