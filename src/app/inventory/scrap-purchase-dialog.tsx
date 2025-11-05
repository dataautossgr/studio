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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const scrapPurchaseSchema = z.object({
  weightKg: z.coerce.number().min(0.1, 'Weight must be positive'),
  ratePerKg: z.coerce.number().min(1, 'Rate must be positive'),
  paymentMethod: z.enum(['Cash', 'Bank']),
  sellerName: z.string().optional(),
  sellerAddress: z.string().optional(),
  sellerNIC: z.string().optional(),
});

export type ScrapPurchaseFormData = z.infer<typeof scrapPurchaseSchema>;

interface ScrapPurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ScrapPurchaseFormData) => void;
}

export function ScrapPurchaseDialog({ isOpen, onClose, onSave }: ScrapPurchaseDialogProps) {
  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<ScrapPurchaseFormData>({
    resolver: zodResolver(scrapPurchaseSchema),
  });
  
  const { weightKg, ratePerKg } = watch();
  const totalValue = (weightKg || 0) * (ratePerKg || 0);

  useEffect(() => {
    if (isOpen) {
      reset({
        weightKg: 0,
        ratePerKg: 0,
        paymentMethod: 'Cash',
        sellerName: '',
        sellerAddress: '',
        sellerNIC: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = (data: ScrapPurchaseFormData) => {
    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Scrap Battery Purchase</DialogTitle>
          <DialogDescription>
            Record a new purchase of scrap batteries. This will update your scrap inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 py-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="weightKg">Weight (KG)</Label>
                    <Input id="weightKg" type="number" step="0.1" {...register('weightKg')} className={errors.weightKg ? 'border-destructive' : ''} />
                    {errors.weightKg && <p className="text-xs text-destructive mt-1">{errors.weightKg.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ratePerKg">Rate (Rs. per KG)</Label>
                    <Input id="ratePerKg" type="number" {...register('ratePerKg')} className={errors.ratePerKg ? 'border-destructive' : ''} />
                    {errors.ratePerKg && <p className="text-xs text-destructive mt-1">{errors.ratePerKg.message}</p>}
                </div>
            </div>

            <div className="p-4 bg-muted rounded-md text-center">
                <p className="text-sm text-muted-foreground">Total Purchase Value</p>
                <p className="text-2xl font-bold font-mono">Rs. {totalValue.toLocaleString()}</p>
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
                                <RadioGroupItem value="Bank" id="bank" />
                                <Label htmlFor="bank">Bank Transfer</Label>
                            </div>
                        </RadioGroup>
                    )}
                />
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold text-muted-foreground text-sm">Seller Information (Optional)</h4>
                <div className="space-y-2">
                    <Label htmlFor="sellerName">Seller Name</Label>
                    <Input id="sellerName" {...register('sellerName')} placeholder="e.g., John Doe" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="sellerNIC">Seller CNIC</Label>
                    <Input id="sellerNIC" {...register('sellerNIC')} placeholder="e.g., 42201-1234567-8" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="sellerAddress">Seller Address</Label>
                    <Textarea id="sellerAddress" {...register('sellerAddress')} placeholder="Enter seller's address..."/>
                </div>
            </div>
            
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Purchase</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    