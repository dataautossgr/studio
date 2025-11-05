'use client';
import type { Dealer } from '@/lib/data';
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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const dealerSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  name: z.string().min(1, 'Contact person name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().optional(),
});

type DealerFormData = z.infer<typeof dealerSchema>;

interface DealerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dealer: Omit<Dealer, 'id' | 'balance' | 'type'>, type: 'automotive' | 'battery') => void;
  dealer: Dealer | null;
  type: 'automotive' | 'battery';
}

export function DealerDialog({ isOpen, onClose, onSave, dealer, type: initialType }: DealerDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DealerFormData>({
    resolver: zodResolver(dealerSchema),
  });

  const [dealerType, setDealerType] = useState(initialType);

  useEffect(() => {
    setDealerType(initialType);
    if (dealer) {
      reset(dealer);
      setDealerType(dealer.type);
    } else {
      reset({
        company: '',
        name: '',
        phone: '',
        address: '',
      });
    }
  }, [dealer, reset, isOpen, initialType]);

  const onSubmit = (data: DealerFormData) => {
    onSave(data, dealerType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dealer ? 'Edit Dealer' : 'Add New Dealer'}</DialogTitle>
          <DialogDescription>
            {dealer ? 'Update the details of this dealer.' : 'Fill in the details for the new dealer.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type</Label>
              <div className="col-span-3">
                 <RadioGroup 
                    value={dealerType}
                    onValueChange={(val: 'automotive' | 'battery') => setDealerType(val)}
                    className="flex gap-4 pt-2"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="automotive" id="automotive" />
                        <Label htmlFor="automotive">Automotive</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="battery" id="battery" />
                        <Label htmlFor="battery">Battery</Label>
                    </div>
                </RadioGroup>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company" className="text-right">Company</Label>
              <div className="col-span-3">
                <Input id="company" {...register('company')} className={errors.company ? 'border-destructive' : ''}/>
                {errors.company && <p className="text-xs text-destructive mt-1">{errors.company.message}</p>}
              </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Contact Person</Label>
              <div className="col-span-3">
                <Input id="name" {...register('name')} className={errors.name ? 'border-destructive' : ''}/>
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone #</Label>
              <div className="col-span-3">
                <Input id="phone" {...register('phone')} className={errors.phone ? 'border-destructive' : ''}/>
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="address" className="text-right pt-2">Address</Label>
                <div className="col-span-3">
                    <Textarea id="address" {...register('address')} placeholder="Optional dealer address..."/>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Dealer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
