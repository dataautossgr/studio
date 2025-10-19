'use client';
import type { Product } from '@/lib/data';
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

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string(),
  costPrice: z.coerce.number().min(0, 'Cost price must be positive'),
  salePrice: z.coerce.number().min(0, 'Sale price must be positive'),
  stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock must be positive'),
  lowStockThreshold: z.coerce.number().int().min(0),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  product: Product | null;
}

export function ProductDialog({ isOpen, onClose, onSave, product }: ProductDialogProps) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    if (product) {
      reset(product);
    } else {
      reset({
        name: '',
        category: '',
        brand: '',
        model: '',
        costPrice: 0,
        salePrice: 0,
        stock: 0,
        lowStockThreshold: 10,
      });
    }
  }, [product, reset, isOpen]);
  
  const onSubmit = (data: ProductFormData) => {
    onSave({
        ...data,
        id: product?.id || '', // Keep original id or it will be assigned on save
        imageUrl: product?.imageUrl || 'https://picsum.photos/seed/placeholder/64/64',
        imageHint: product?.imageHint || 'placeholder'
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
              <Label htmlFor="name" className="text-right">Name</Label>
              <div className="col-span-3">
                <Input id="name" {...register('name')} className={errors.name ? 'border-destructive' : ''}/>
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
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
                    <Label htmlFor="lowStockThreshold" className="text-right">Low Stock Warning</Label>
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
