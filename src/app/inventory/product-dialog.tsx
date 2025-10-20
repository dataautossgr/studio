'use client';
import type { Product, Unit, Dealer } from '@/lib/data';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';


const units: Unit[] = [
    'piece', 'cartoon', 'ml', 'litre', 'kg', 'g', 'inch', 'foot', 'meter'
];

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string(),
  costPrice: z.coerce.number().min(0, 'Cost price must be positive'),
  salePrice: z.coerce.number().min(0, 'Sale price must be positive'),
  stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock must be positive'),
  unit: z.enum(units),
  lowStockThreshold: z.coerce.number().int().min(0),
  imageUrl: z.string().optional(),
  dealerId: z.string().optional(),
  location: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'>) => void;
  product: Product | null;
}

export function ProductDialog({ isOpen, onClose, onSave, product }: ProductDialogProps) {
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const firestore = useFirestore();
  const { data: dealers, isLoading: isLoadingDealers } = useCollection<Dealer>(collection(firestore, 'dealers'));
  const imageUrl = watch('imageUrl');


  useEffect(() => {
    if (isOpen) {
      if (product) {
        reset(product);
      } else {
        reset({
          name: '',
          description: '',
          category: '',
          brand: '',
          model: '',
          costPrice: 0,
          salePrice: 0,
          stock: 0,
          unit: 'piece',
          lowStockThreshold: 10,
          imageUrl: '',
          dealerId: '',
          location: '',
        });
      }
    }
  }, [product, reset, isOpen]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('imageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const onSubmit = (data: ProductFormData) => {
    onSave({
        ...data,
        imageUrl: data.imageUrl || product?.imageUrl || 'https://picsum.photos/seed/placeholder/64/64',
        imageHint: product?.imageHint || 'product'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update the details of your product.' : 'Fill in the details for the new product.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label>Image</Label>
                <div className="col-span-3 flex items-center gap-4">
                    <Image
                        src={imageUrl || 'https://picsum.photos/seed/placeholder/64/64'}
                        alt="Product image"
                        width={64}
                        height={64}
                        className="rounded-md aspect-square object-cover"
                    />
                    <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="text-xs" />
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <div className="col-span-3">
                <Input id="name" {...register('name')} className={errors.name ? 'border-destructive' : ''}/>
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">Description</Label>
                <div className="col-span-3">
                    <Textarea id="description" {...register('description')} placeholder="Optional product details..."/>
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                 <div className="col-span-3">
                    <Input id="category" {...register('category')} className={errors.category ? 'border-destructive' : ''}/>
                    {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor="brand" className="text-right">Brand</Label>
                    <Input id="brand" {...register('brand')} className={errors.brand ? 'border-destructive' : ''}/>
                    {errors.brand && <p className="text-xs text-destructive mt-1 col-span-2 text-right">{errors.brand.message}</p>}
                </div>
                 <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor="model" className="text-right">Model</Label>
                    <Input id="model" {...register('model')} />
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor="dealerId" className="text-right">Dealer</Label>
                    <Controller
                        name="dealerId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select dealer" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">None</SelectItem>
                                    {dealers?.map(d => <SelectItem key={d.id} value={d.id}>{d.company}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor="location" className="text-right">Location</Label>
                    <Input id="location" {...register('location')} placeholder="e.g. Shelf A-3" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor="costPrice" className="text-right">Purchase Cost</Label>
                    <Input id="costPrice" type="number" {...register('costPrice')} className={errors.costPrice ? 'border-destructive' : ''}/>
                    {errors.costPrice && <p className="text-xs text-destructive mt-1 col-span-2 text-right">{errors.costPrice.message}</p>}
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor="salePrice" className="text-right">Sales Cost</Label>
                    <Input id="salePrice" type="number" {...register('salePrice')} className={errors.salePrice ? 'border-destructive' : ''}/>
                    {errors.salePrice && <p className="text-xs text-destructive mt-1 col-span-2 text-right">{errors.salePrice.message}</p>}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor="stock" className="text-right">Stock</Label>
                    <Input id="stock" type="number" {...register('stock')} className={errors.stock ? 'border-destructive' : ''}/>
                    {errors.stock && <p className="text-xs text-destructive mt-1 col-span-2 text-right">{errors.stock.message}</p>}
                </div>
                 <div className="grid grid-cols-2 items-center gap-4">
                    <Label htmlFor="unit" className="text-right">Unit</Label>
                    <Controller
                        name="unit"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lowStockThreshold" className="text-right">Low Stock Warning</Label>
                <div className="col-span-3">
                    <Input id="lowStockThreshold" type="number" {...register('lowStockThreshold')} />
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
