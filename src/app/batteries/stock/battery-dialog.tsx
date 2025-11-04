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
import type { Battery } from '@/lib/data';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';

const batteryTypes = ['Lead-Acid', 'Lithium', 'AGM'] as const;

const batterySchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  ampere: z.coerce.number().min(1, 'Ampere rating is required'),
  type: z.enum(batteryTypes),
  costPrice: z.coerce.number().min(0, 'Cost price must be positive'),
  salePrice: z.coerce.number().min(0, 'Sale price must be positive'),
  stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock must be positive'),
  warrantyMonths: z.coerce.number().int().min(0, 'Warranty must be positive'),
});

export type BatteryFormData = z.infer<typeof batterySchema>;

interface BatteryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BatteryFormData) => void;
  battery: Battery | null;
}

export function BatteryDialog({ isOpen, onClose, onSave, battery }: BatteryDialogProps) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<BatteryFormData>({
    resolver: zodResolver(batterySchema),
  });
  
  const isEditing = !!battery;

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        reset(battery);
      } else {
        reset({
          brand: '',
          model: '',
          ampere: 0,
          type: 'Lead-Acid',
          costPrice: 0,
          salePrice: 0,
          stock: 0,
          warrantyMonths: 12,
        });
      }
    }
  }, [isOpen, reset, battery, isEditing]);

  const onSubmit = (data: BatteryFormData) => {
    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Battery Details' : 'Add New Battery to Stock'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this battery.' : 'Fill in the details for the new battery.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" {...register('brand')} className={errors.brand ? 'border-destructive' : ''} />
                {errors.brand && <p className="text-xs text-destructive mt-1">{errors.brand.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" {...register('model')} className={errors.model ? 'border-destructive' : ''} />
                 {errors.model && <p className="text-xs text-destructive mt-1">{errors.model.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="ampere">Ampere (Ah)</Label>
                    <Input id="ampere" type="number" {...register('ampere')} className={errors.ampere ? 'border-destructive' : ''} />
                    {errors.ampere && <p className="text-xs text-destructive mt-1">{errors.ampere.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label>Type</Label>
                    <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {batteryTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="costPrice">Cost Price (Rs.)</Label>
                    <Input id="costPrice" type="number" {...register('costPrice')} className={errors.costPrice ? 'border-destructive' : ''} />
                     {errors.costPrice && <p className="text-xs text-destructive mt-1">{errors.costPrice.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="salePrice">Sale Price (Rs.)</Label>
                    <Input id="salePrice" type="number" {...register('salePrice')} className={errors.salePrice ? 'border-destructive' : ''} />
                    {errors.salePrice && <p className="text-xs text-destructive mt-1">{errors.salePrice.message}</p>}
                </div>
            </div>

             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="stock">Initial Stock</Label>
                    <Input id="stock" type="number" {...register('stock')} className={errors.stock ? 'border-destructive' : ''} readOnly={isEditing}/>
                     {errors.stock && <p className="text-xs text-destructive mt-1">{errors.stock.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="warrantyMonths">Warranty (Months)</Label>
                    <Input id="warrantyMonths" type="number" {...register('warrantyMonths')} className={errors.warrantyMonths ? 'border-destructive' : ''} />
                    {errors.warrantyMonths && <p className="text-xs text-destructive mt-1">{errors.warrantyMonths.message}</p>}
                </div>
            </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditing ? 'Save Changes' : 'Add to Stock'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
