'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Product, Customer, Dealer } from '@/lib/data';
import { collection } from 'firebase/firestore';
import { File, User, Building } from 'lucide-react';

interface MasterSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MasterSearchDialog({ open, onOpenChange }: MasterSearchDialogProps) {
  const router = useRouter();
  const firestore = useFirestore();

  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const dealersCollection = useMemoFirebase(() => collection(firestore, 'dealers'), [firestore]);

  const { data: products } = useCollection<Product>(productsCollection);
  const { data: customers } = useCollection<Customer>(customersCollection);
  const { data: dealers } = useCollection<Dealer>(dealersCollection);
  
  const runCommand = (command: () => unknown) => {
    onOpenChange(false);
    command();
  };

  return (
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput placeholder="Search for products, customers, dealers..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {products && products.length > 0 && (
            <CommandGroup heading="Products">
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`product-${product.name}-${product.brand}`}
                  onSelect={() => runCommand(() => router.push('/inventory'))}
                >
                  <File className="mr-2 h-4 w-4" />
                  <span>{product.name} ({product.brand})</span>
                   <span className="ml-auto text-xs text-muted-foreground">Rs. {product.costPrice.toLocaleString()}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {customers && customers.length > 0 && (
             <CommandGroup heading="Customers">
              {customers.filter(c => c.type === 'registered').map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`customer-${customer.name}-${customer.phone}`}
                  onSelect={() => runCommand(() => router.push(`/customers/${customer.id}`))}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{customer.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {dealers && dealers.length > 0 && (
            <CommandGroup heading="Dealers">
                {dealers.map((dealer) => (
                    <CommandItem
                    key={dealer.id}
                    value={`dealer-${dealer.company}-${dealer.name}`}
                    onSelect={() => runCommand(() => router.push(`/dealers/${dealer.id}`))}
                    >
                    <Building className="mr-2 h-4 w-4" />
                    <span>{dealer.company}</span>
                    </CommandItem>
                ))}
            </CommandGroup>
          )}

        </CommandList>
      </CommandDialog>
  );
}
