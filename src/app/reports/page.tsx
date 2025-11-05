'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, ShoppingBag, TrendingUp, Package, Printer, Battery, Car } from 'lucide-react';
import { SalesChart } from './sales-chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState, useMemo } from 'react';
import type { Sale, Product, BatterySale, Battery as BatteryType, SaleItem } from '@/lib/data';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

type TimePeriod = 'today' | 'weekly' | 'monthly' | 'all';

const ReportView = ({ 
  sales, 
  products, 
  isLoading 
}: { 
  sales: Sale[] | BatterySale[] | null, 
  products: Product[] | BatteryType[] | null, 
  isLoading: boolean 
}) => {

  const { totalRevenue, totalProfit, totalSales, totalProductsSold } = useMemo(() => {
    if (isLoading || !sales || !products) {
        return { totalRevenue: 0, totalProfit: 0, totalSales: 0, totalProductsSold: 0 };
    }
    
    const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);

    const profit = sales.reduce((sum, sale) => {
        const saleItems = (Array.isArray(sale.items) ? sale.items : []) as (Sale['items'][0] | SaleItem)[];
        const cost = saleItems.reduce((itemSum, item) => {
            if ('type' in item && item.type === 'scrap') {
                return itemSum;
            }
            const productId = 'productId' in item ? item.productId : ('id' in item ? item.id : null);
            if (!productId) return itemSum;

            const product = products.find(p => p.id === productId);
            // @ts-ignore
            const itemCost = product ? (product.costPrice || 0) * item.quantity : 0;
            return itemSum + itemCost;
        }, 0);
        return sum + (sale.total - cost);
    }, 0);

    const productsSoldCount = sales
        .flatMap(s => Array.isArray(s.items) ? s.items : [])
        .reduce((sum, i) => sum + (i.quantity ?? 0), 0);

    return {
        totalRevenue: revenue,
        totalProfit: profit,
        totalSales: sales.length,
        totalProductsSold: productsSoldCount
    };
  }, [sales, products, isLoading]);

  const topSellingProducts = useMemo(() => {
    if (isLoading || !products || !sales) return [];
    
    const productSales = new Map<string, number>();

    sales.forEach(sale => {
        if(Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const productId = 'productId' in item ? item.productId : ('id' in item ? item.id : null);
                if (!productId) return;
                
                const currentQty = productSales.get(productId) || 0;
                productSales.set(productId, currentQty + item.quantity);
            });
        }
    });

    return Array.from(productSales.entries())
        .map(([productId, sold]) => {
            const product = products.find(p => p.id === productId);
            return { 
                id: productId,
                // @ts-ignore
                name: product ? `${product.brand || ''} ${product.model || ''}`.trim() || product.name : 'Unknown',
                sold 
            };
        })
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5);

  }, [products, sales, isLoading]);

  const reportCards = [
    { title: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, icon: DollarSign },
    { title: "Total Profit", value: `Rs. ${totalProfit.toLocaleString()}`, icon: TrendingUp },
    { title: "Total Sales", value: totalSales.toString(), icon: ShoppingBag },
    { title: "Total Products Sold", value: totalProductsSold.toString(), icon: Package },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="print:border-none print:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-2/3 bg-muted rounded-md animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-1/2 bg-muted rounded-md animate-pulse" />
            </CardContent>
          </Card>
        )) : reportCards.map((card, i) => (
          <Card key={i} className="print:border-gray-300 print:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3 print:grid-cols-1">
        <Card className="lg:col-span-2 print:col-span-1 print:border-gray-300 print:shadow-md">
          <CardHeader>
            <CardTitle>Sales Over Time</CardTitle>
            <CardDescription>A summary of your sales over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart />
          </CardContent>
        </Card>
        <Card className="print:border-gray-300 print:shadow-md">
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Your most popular items for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : topSellingProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">No products sold in this period.</TableCell>
                  </TableRow>
                ) : (
                  topSellingProducts.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{p.sold}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default function ReportsPage() {
  const firestore = useFirestore();
  
  // Collections for Automotive
  const salesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'sales') : null, [firestore]);
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  
  // Collections for Battery
  const batterySalesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'battery_sales') : null, [firestore]);
  const batteriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'batteries') : null, [firestore]);
  
  // Data hooks for Automotive
  const { data: automotiveSales, isLoading: automotiveSalesLoading } = useCollection<Sale>(salesCollection);
  const { data: automotiveProducts, isLoading: automotiveProductsLoading } = useCollection<Product>(productsCollection);
  
  // Data hooks for Battery
  const { data: batterySales, isLoading: batterySalesLoading } = useCollection<BatterySale>(batterySalesCollection);
  const { data: batteries, isLoading: batteriesLoading } = useCollection<BatteryType>(batteriesCollection);
  
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');

  const filterByTime = (data: Sale[] | BatterySale[] | null) => {
    if (!data) return [];
    const now = new Date();
    let startDate: Date;

    switch (timePeriod) {
      case 'today': startDate = startOfDay(now); break;
      case 'weekly': startDate = startOfWeek(now); break;
      case 'monthly': startDate = startOfMonth(now); break;
      case 'all': default: return data;
    }

    const endDate = endOfDay(now);
    return data.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= startDate && saleDate <= endDate;
    });
  };
  
  const filteredAutomotiveSales = useMemo(() => filterByTime(automotiveSales), [automotiveSales, timePeriod]);
  const filteredBatterySales = useMemo(() => filterByTime(batterySales), [batterySales, timePeriod]);
  
  const isLoadingAutomotive = automotiveSalesLoading || automotiveProductsLoading;
  const isLoadingBattery = batterySalesLoading || batteriesLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-start no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">View business performance for each category.</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs defaultValue="today" onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="weekly">This Week</TabsTrigger>
              <TabsTrigger value="monthly">This Month</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="automotive" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="automotive" className="gap-2"><Car/> Automotive Report</TabsTrigger>
            <TabsTrigger value="battery" className="gap-2"><Battery/> Battery Report</TabsTrigger>
        </TabsList>
        <TabsContent value="automotive" className="mt-6">
            <ReportView 
                sales={filteredAutomotiveSales} 
                products={automotiveProducts} 
                isLoading={isLoadingAutomotive}
            />
        </TabsContent>
        <TabsContent value="battery" className="mt-6">
            <ReportView 
                sales={filteredBatterySales} 
                products={batteries} 
                isLoading={isLoadingBattery}
            />
        </TabsContent>
      </Tabs>
    </div>
  );
}
