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

const sellScrapSchema = z.object({
  weightKg: z.coerce.number().min(0.1, 'Weight must be positive'),
  ratePerKg: z.coerce.number().min(1, 'Rate must be positive'),
  buyerName: z.string().min(1, 'Buyer name is required'),
});

export type SellScrapFormData = z.infer<typeof sellScrapSchema>;

interface SellScrapDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SellScrapFormData) => void;
  maxWeight: number;
}

export function SellScrapDialog({ isOpen, onClose, onSave, maxWeight }: SellScrapDialogProps) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<SellScrapFormData>({
    resolver: zodResolver(sellScrapSchema.refine(data => data.weightKg <= maxWeight, {
      message: `Weight cannot exceed available stock of ${maxWeight} KG`,
      path: ['weightKg'],
    })),
  });
  
  const { weightKg, ratePerKg } = watch();
  const totalValue = (weightKg || 0) * (ratePerKg || 0);

  useEffect(() => {
    if (isOpen) {
      reset({
        weightKg: 0,
        ratePerKg: 0,
        buyerName: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = (data: SellScrapFormData) => {
    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sell Scrap Batteries</DialogTitle>
          <DialogDescription>
            Record a sale of scrap batteries. This will deduct from your scrap stock.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 py-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="weightKg">Weight to Sell (KG)</Label>
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
                <p className="text-sm text-muted-foreground">Total Sale Value</p>
                <p className="text-2xl font-bold font-mono">Rs. {totalValue.toLocaleString()}</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="buyerName">Buyer Name</Label>
                <Input id="buyerName" {...register('buyerName')} placeholder="e.g., Akram Scrap Dealer" className={errors.buyerName ? 'border-destructive' : ''} />
                {errors.buyerName && <p className="text-xs text-destructive mt-1">{errors.buyerName.message}</p>}
            </div>
            
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Sale</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
