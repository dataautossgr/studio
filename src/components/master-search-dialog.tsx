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
import type { Product, Customer, Dealer, Battery } from '@/lib/data';
import { collection } from 'firebase/firestore';
import { File, User, Building, Battery as BatteryIcon } from 'lucide-react';

interface MasterSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MasterSearchDialog({ open, onOpenChange }: MasterSearchDialogProps) {
  const router = useRouter();
  const firestore = useFirestore();

  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const batteriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'batteries') : null, [firestore]);
  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const dealersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'dealers') : null, [firestore]);

  const { data: products } = useCollection<Product>(productsCollection);
  const { data: batteries } = useCollection<Battery>(batteriesCollection);
  const { data: customers } = useCollection<Customer>(customersCollection);
  const { data: dealers } = useCollection<Dealer>(dealersCollection);
  
  const runCommand = (command: () => unknown) => {
    onOpenChange(false);
    command();
  };

  return (
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput placeholder="Search for products, batteries, customers, dealers..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {(products && products.length > 0) || (batteries && batteries.length > 0) && (
            <CommandGroup heading="Inventory">
              {products?.map((product) => (
                <CommandItem
                  key={`prod-${product.id}`}
                  value={`product-${product.name}-${product.brand}`}
                  onSelect={() => runCommand(() => router.push('/inventory?tab=automotive'))}
                >
                  <File className="mr-2 h-4 w-4" />
                  <span>{product.name} ({product.brand})</span>
                   <span className="ml-auto text-xs text-muted-foreground">Rs. {product.salePrice.toLocaleString()}</span>
                </CommandItem>
              ))}
              {batteries?.map((battery) => (
                <CommandItem
                  key={`batt-${battery.id}`}
                  value={`battery-${battery.brand}-${battery.model}`}
                  onSelect={() => runCommand(() => router.push('/inventory?tab=batteries'))}
                >
                  <BatteryIcon className="mr-2 h-4 w-4" />
                  <span>{battery.brand} {battery.model} ({battery.ampere}Ah)</span>
                   <span className="ml-auto text-xs text-muted-foreground">Rs. {battery.salePrice.toLocaleString()}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {customers && customers.length > 0 && (
             <CommandGroup heading="Customers">
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`customer-${customer.name}-${customer.phone}`}
                  onSelect={() => runCommand(() => router.push(`/customers/${customer.id}`))}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{customer.name} ({customer.type})</span>
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
                    <span>{dealer.company} ({dealer.type})</span>
                    </CommandItem>
                ))}
            </CommandGroup>
          )}

        </CommandList>
      </CommandDialog>
  );
}
