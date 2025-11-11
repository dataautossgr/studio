'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Product, Battery } from '@/lib/data';
import Image from 'next/image';

function LowStockTable({ data, type, isLoading }: { data: any[] | null, type: 'Automotive' | 'Battery', isLoading: boolean }) {
  const items = useMemo(() => {
    if (!data) return [];
    // @ts-ignore
    return data.filter(item => item.stock <= item.lowStockThreshold);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type} Low Stock Items</CardTitle>
        <CardDescription>
          These items have reached or fallen below their low stock threshold.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {type === 'Automotive' && <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>}
              <TableHead>Name / Model</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-center">Threshold</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading items...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No items are currently low on stock.
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id}>
                {type === 'Automotive' && (
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      alt={item.name}
                      className="aspect-square rounded-md object-cover"
                      height="64"
                      src={item.imageUrl}
                      width="64"
                      data-ai-hint={item.imageHint}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{type === 'Automotive' ? item.name : item.model}</TableCell>
                <TableCell>{item.brand}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="destructive">{item.stock}</Badge>
                </TableCell>
                <TableCell className="text-center">{item.lowStockThreshold}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function LowStockPage() {
  const firestore = useFirestore();

  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const batteriesCollection = useMemoFirebase(() => collection(firestore, 'batteries'), [firestore]);

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection);
  const { data: batteries, isLoading: isLoadingBatteries } = useCollection<Battery>(batteriesCollection);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Low Stock Alerts</h1>
          <p className="text-muted-foreground">
            A centralized view of all items that need reordering.
          </p>
        </div>
      </div>

      <Tabs defaultValue="automotive" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="automotive">Automotive</TabsTrigger>
          <TabsTrigger value="batteries">Batteries</TabsTrigger>
        </TabsList>
        <TabsContent value="automotive" className="mt-6">
          <LowStockTable data={products} type="Automotive" isLoading={isLoadingProducts} />
        </TabsContent>
        <TabsContent value="batteries" className="mt-6">
          <LowStockTable data={batteries} type="Battery" isLoading={isLoadingBatteries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
