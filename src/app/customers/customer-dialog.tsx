'use client';
import type { Customer } from '@/lib/data';
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

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  vehicleDetails: z.string().min(1, 'Vehicle details are required'),
  address: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id' | 'balance' | 'type'>, type: 'automotive' | 'battery') => void;
  customer: Customer | null;
  type: 'automotive' | 'battery';
}

export function CustomerDialog({ isOpen, onClose, onSave, customer, type: initialType }: CustomerDialogProps) {
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });
  
  const [customerType, setCustomerType] = useState(initialType);

  useEffect(() => {
    setCustomerType(initialType);
    if (customer) {
      reset(customer);
      setCustomerType(customer.type);
    } else {
      reset({
        name: '',
        phone: '',
        vehicleDetails: '',
        address: '',
      });
    }
  }, [customer, reset, isOpen, initialType]);

  const onSubmit = (data: CustomerFormData) => {
    onSave(data, customerType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {customer ? 'Update the details of this customer.' : 'Fill in the details for the new customer.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type</Label>
              <div className="col-span-3">
                 <RadioGroup 
                    value={customerType}
                    onValueChange={(val: 'automotive' | 'battery') => setCustomerType(val)}
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
              <Label htmlFor="name" className="text-right">Name</Label>
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
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vehicleDetails" className="text-right">Vehicle Details</Label>
              <div className="col-span-3">
                <Input id="vehicleDetails" {...register('vehicleDetails')} className={errors.vehicleDetails ? 'border-destructive' : ''}/>
                {errors.vehicleDetails && <p className="text-xs text-destructive mt-1">{errors.vehicleDetails.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="address" className="text-right pt-2">Address</Label>
                <div className="col-span-3">
                    <Textarea id="address" {...register('address')} placeholder="Optional customer address..."/>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Customer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
