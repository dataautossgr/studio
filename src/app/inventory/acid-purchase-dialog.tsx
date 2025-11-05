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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';

const acidPurchaseSchema = z.object({
  quantityKg: z.coerce.number().min(0.1, 'Quantity must be positive'),
  ratePerKg: z.coerce.number().min(1, 'Rate must be positive'),
  supplier: z.string().optional(),
});

export type AcidPurchaseFormData = z.infer<typeof acidPurchaseSchema>;

interface AcidPurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AcidPurchaseFormData) => void;
}

export function AcidPurchaseDialog({ isOpen, onClose, onSave }: AcidPurchaseDialogProps) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AcidPurchaseFormData>({
    resolver: zodResolver(acidPurchaseSchema),
  });
  
  const { quantityKg, ratePerKg } = watch();
  const totalValue = (quantityKg || 0) * (ratePerKg || 0);

  useEffect(() => {
    if (isOpen) {
      reset({
        quantityKg: 0,
        ratePerKg: 0,
        supplier: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = (data: AcidPurchaseFormData) => {
    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Acid Purchase</DialogTitle>
          <DialogDescription>
            Record a new purchase of acid. This will update your total acid stock.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 py-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="quantityKg">Quantity (KG)</Label>
                    <Input id="quantityKg" type="number" step="0.1" {...register('quantityKg')} className={errors.quantityKg ? 'border-destructive' : ''} />
                    {errors.quantityKg && <p className="text-xs text-destructive mt-1">{errors.quantityKg.message}</p>}
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
                <Label htmlFor="supplier">Supplier (Optional)</Label>
                <Input id="supplier" {...register('supplier')} placeholder="e.g., Lahore Chemical Co." />
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
