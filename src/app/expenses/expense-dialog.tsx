
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import type { Expense } from './page';

const expenseCategories = [
  'Staff Salary',
  'Maintenance / Repairs',
  'Utility Bills',
  'Freight / Transport',
  'Mobile / Communication',
  'Rent / Property',
  'Tools / Supplies',
  'Bank Charges',
  'Discounts / Returns Adjustments',
  'Miscellaneous / Others',
];

const expenseSchema = z.object({
  date: z.date(),
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['Cash', 'Online', 'Credit']),
  paidTo: z.string().min(1, 'Paid To is required'),
  description: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData) => void;
  expense: Expense | null;
}

export function ExpenseDialog({
  isOpen,
  onClose,
  onSave,
  expense,
}: ExpenseDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
  });

  const isEditing = !!expense;
  const attachmentUrl = watch('attachmentUrl');

  useEffect(() => {
    if (isOpen) {
      if (isEditing && expense) {
        reset({
          ...expense,
          date: new Date(expense.date),
        });
      } else {
        reset({
          date: new Date(),
          category: '',
          amount: 0,
          paymentMethod: 'Cash',
          paidTo: '',
          description: '',
          attachmentUrl: '',
        });
      }
    }
  }, [isOpen, reset, expense, isEditing]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('attachmentUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: ExpenseFormData) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add New'} Expense</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details of this expense.'
              : 'Fill in the details to record a new expense.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expense Date</Label>
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
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
                <Label htmlFor="amount">Amount (Rs.)</Label>
                <Input
                  id="amount"
                  type="number"
                  {...register('amount')}
                  className={errors.amount ? 'border-destructive' : ''}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.amount.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger
                        className={errors.category ? 'border-destructive' : ''}
                      >
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                 {errors.category && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.category.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidTo">Paid To</Label>
                <Input
                  id="paidTo"
                  {...register('paidTo')}
                  placeholder="e.g., Rehmat Khan"
                  className={errors.paidTo ? 'border-destructive' : ''}
                />
                 {errors.paidTo && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.paidTo.message}
                  </p>
                )}
              </div>
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
                      <RadioGroupItem value="Online" id="online" />
                      <Label htmlFor="online">Online</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Credit" id="credit" />
                      <Label htmlFor="credit">Credit</Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description / Note</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Optional expense details or reference..."
              />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="attachment-upload">Upload Bill / Receipt (Optional)</Label>
                <div className="flex items-center gap-4">
                  {attachmentUrl ? (
                     <Image
                        src={attachmentUrl}
                        alt="Attachment preview"
                        width={64}
                        height={64}
                        className="rounded-md aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <Input id="attachment-upload" type="file" accept="image/*" onChange={handleImageChange} className="text-xs" />
                </div>
            </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Save Changes' : 'Save Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
