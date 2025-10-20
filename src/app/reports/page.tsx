
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, ShoppingBag, TrendingUp, Users, Package, CreditCard } from 'lucide-react';
import { SalesChart } from './sales-chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { getSales, getProducts, getCustomers, getDealers, type Sale, type Product } from '@/lib/data';
import { format } from 'date-fns';

export default function ReportsPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    
    useEffect(() => {
        getSales().then(setSales);
        getProducts().then(setProducts);
    }, []);

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = sales.reduce((sum, sale) => {
        const cost = sale.items.reduce((itemSum, item) => {
            const product = products.find(p => p.id === item.productId);
            return itemSum + (product ? product.costPrice * item.quantity : 0);
        }, 0);
        return sum + (sale.total - cost);
    }, 0);

    const topSellingProducts = products
        .map(p => {
            const sold = sales.flatMap(s => s.items)
                              .filter(i => i.productId === p.id)
                              .reduce((sum, i) => sum + i.quantity, 0);
            return { ...p, sold };
        })
        .filter(p => p.sold > 0)
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5);


    const reportCards = [
        { title: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, icon: DollarSign, change: "+15.2% from last month" },
        { title: "Total Profit", value: `Rs. ${totalProfit.toLocaleString()}`, icon: TrendingUp, change: "+20% from last month" },
        { title: "Total Sales", value: sales.length.toString(), icon: ShoppingBag, change: "+8 orders from last month" },
        { title: "Total Products Sold", value: sales.flatMap(s => s.items).reduce((sum, i) => sum + i.quantity, 0).toString(), icon: Package, change: "" },
    ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
                View your business performance and financial data.
            </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {reportCards.map((card, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        <card.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{card.value}</div>
                        <p className="text-xs text-muted-foreground">{card.change}</p>
                    </CardContent>
                </Card>
            ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Sales Over Time</CardTitle>
                    <CardDescription>A summary of your sales over the last 6 months.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SalesChart />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>Your most popular items this month.</CardDescription>
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
                            {topSellingProducts.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell className="text-right">{p.sold}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
