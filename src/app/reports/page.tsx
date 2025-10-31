
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, ShoppingBag, TrendingUp, Package, Printer } from 'lucide-react';
import { SalesChart } from './sales-chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEffect, useState, useMemo, useRef } from 'react';
import type { Sale, Product } from '@/lib/data';
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
import { useReactToPrint } from 'react-to-print';

type TimePeriod = 'today' | 'weekly' | 'monthly' | 'all';

export default function ReportsPage() {
  const firestore = useFirestore();
  const salesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'sales') : null, [firestore]);
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesCollection);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    const now = new Date();
    let startDate: Date;

    switch (timePeriod) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'weekly':
        startDate = startOfWeek(now);
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        break;
      case 'all':
      default:
        return sales;
    }

    const endDate = endOfDay(now); // Always show up to the current moment
    return sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= startDate && saleDate <= endDate;
    });
  }, [sales, timePeriod]);


  const { totalRevenue, totalProfit, totalSales, totalProductsSold } = useMemo(() => {
    if (salesLoading || productsLoading || !filteredSales || !products) {
        return { totalRevenue: 0, totalProfit: 0, totalSales: 0, totalProductsSold: 0 };
    }
    
    const revenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

    const profit = filteredSales.reduce((sum, sale) => {
        const cost = sale.items.reduce((itemSum, item) => {
            const product = products.find(p => p.id === item.productId);
            // If product is not found (e.g., one-time item), its cost is considered 0 for profit calculation
            return itemSum + (product ? product.costPrice * item.quantity : 0);
        }, 0);
        return sum + (sale.total - cost);
    }, 0);

    const productsSoldCount = filteredSales.flatMap(s => s.items).reduce((sum, i) => sum + i.quantity, 0);

    return {
        totalRevenue: revenue,
        totalProfit: profit,
        totalSales: filteredSales.length,
        totalProductsSold: productsSoldCount
    };
  }, [filteredSales, products, salesLoading, productsLoading]);

    const topSellingProducts = useMemo(() => {
        if (!products || !filteredSales) return [];
        return products
            .map(p => {
                const sold = filteredSales.flatMap(s => s.items)
                                .filter(i => i.productId === p.id)
                                .reduce((sum, i) => sum + i.quantity, 0);
                return { ...p, sold };
            })
            .filter(p => p.sold > 0)
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 5);
    }, [products, filteredSales]);


    const reportCards = [
        { title: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, icon: DollarSign },
        { title: "Total Profit", value: `Rs. ${totalProfit.toLocaleString()}`, icon: TrendingUp },
        { title: "Total Sales", value: totalSales.toString(), icon: ShoppingBag },
        { title: "Total Products Sold", value: totalProductsSold.toString(), icon: Package },
    ];
    
    const isLoading = salesLoading || productsLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex justify-between items-start print:hidden">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <p className="text-muted-foreground">
                    View your business performance and financial data.
                </p>
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
                <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Report
                </Button>
            </div>
        </div>

        <div ref={componentRef} className="space-y-8 print:p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
                {isLoading ? Array.from({length: 4}).map((_, i) => (
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
    </div>
  );
}
