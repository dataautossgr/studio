'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Package, Boxes, Archive, Trash, BatteryCharging } from 'lucide-react';
import { useCollection, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Product, Battery, ScrapStock } from '@/lib/data';
import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AutomotiveInventory from './automotive-inventory';
import BatteryInventory from './battery-inventory';

export default function InventoryPage() {
  const firestore = useFirestore();
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const batteriesCollection = useMemoFirebase(() => collection(firestore, 'batteries'), [firestore]);
  const scrapStockRef = useMemoFirebase(() => firestore ? doc(firestore, 'scrap_stock', 'main') : null, [firestore]);

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection);
  const { data: batteries, isLoading: isLoadingBatteries } = useCollection<Battery>(batteriesCollection);
  const { data: scrapStock, isLoading: isLoadingScrap } = useDoc<ScrapStock>(scrapStockRef);


  const {
    totalSaleValue,
    totalCostValue,
    totalUniqueProducts,
    totalStockQuantity,
    totalBatteryStockValue,
    totalScrapValue,
    totalScrapWeight
  } = useMemo(() => {
    const automotiveCost = products?.reduce((acc, p) => acc + (p.costPrice * p.stock), 0) || 0;
    const automotiveSale = products?.reduce((acc, p) => acc + (p.salePrice * p.stock), 0) || 0;
    const batteryCost = batteries?.reduce((acc, b) => acc + (b.costPrice * b.stock), 0) || 0;

    return {
      totalCostValue: automotiveCost,
      totalSaleValue: automotiveSale,
      totalUniqueProducts: products?.length || 0,
      totalStockQuantity: products?.reduce((acc, p) => acc + p.stock, 0) || 0,
      totalBatteryStockValue: batteryCost,
      totalScrapValue: scrapStock?.totalScrapValue || 0,
      totalScrapWeight: scrapStock?.totalWeightKg || 0,
    };
  }, [products, batteries, scrapStock]);
  
  const isLoading = isLoadingProducts || isLoadingBatteries || isLoadingScrap;

  const inventoryStats = [
    { title: "Automotive Stock Value (Sale)", value: `Rs. ${totalSaleValue.toLocaleString()}`, icon: DollarSign },
    { title: "Automotive Stock Value (Cost)", value: `Rs. ${totalCostValue.toLocaleString()}`, icon: Archive },
    { title: "Battery Stock Value (Cost)", value: `Rs. ${totalBatteryStockValue.toLocaleString()}`, icon: BatteryCharging },
    { title: "Scrap Stock Value", value: `Rs. ${totalScrapValue.toLocaleString()}`, icon: Trash },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? Array.from({length: 4}).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 w-2/3 bg-muted rounded-md animate-pulse" />
                    </CardHeader>
                    <CardContent>
                    <div className="h-8 w-1/2 bg-muted rounded-md animate-pulse" />
                    </CardContent>
                </Card>
            )) : inventoryStats.map((stat, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>

      <Tabs defaultValue="automotive" className="w-full">
         <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                <p className="text-muted-foreground">
                    Manage your products from one screen.
                </p>
            </div>
             <div className="flex items-center gap-4">
                <TabsList>
                    <TabsTrigger value="automotive">Automotive</TabsTrigger>
                    <TabsTrigger value="batteries">Batteries</TabsTrigger>
                </TabsList>
            </div>
        </div>
        <TabsContent value="automotive">
          <AutomotiveInventory />
        </TabsContent>
        <TabsContent value="batteries">
          <BatteryInventory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
