'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CreditCard, DollarSign, Package, TrendingUp, Users, Search, Wrench, PlusCircle, Droplets, ShoppingBag, Car, Battery as BatteryIcon } from 'lucide-react';
import { SalesChart } from '@/app/reports/sales-chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, startOfToday } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, DocumentReference, doc } from 'firebase/firestore';
import type { Sale, Product, Customer, Battery, AcidStock, BatterySale } from '@/lib/data';
import { MasterSearchDialog } from '@/components/master-search-dialog';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  const firestore = useFirestore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const salesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'sales'): null, [firestore]);
  const batterySalesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'battery_sales'): null, [firestore]);
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const batteriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'batteries') : null, [firestore]);
  const acidStockRef = useMemoFirebase(() => firestore ? doc(firestore, 'acid_stock', 'main') : null, [firestore]);


  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesCollection);
  const { data: batterySales, isLoading: batterySalesLoading } = useCollection<BatterySale>(batterySalesCollection);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: batteries, isLoading: batteriesLoading } = useCollection<Battery>(batteriesCollection);
  const { data: acidStock, isLoading: acidLoading } = useDoc<AcidStock>(acidStockRef);

   useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const { lowStockCount, automotivePendingPayments, batteryPendingPayments, todaysRevenue, todaysProfit, isAcidLow, recentSales, automotiveDuesCount, batteryDuesCount } = useMemo(() => {
    if (!sales || !batterySales || !products || !customers || !batteries || !acidStock) {
      return { lowStockCount: 0, automotivePendingPayments: 0, batteryPendingPayments: 0, todaysRevenue: 0, todaysProfit: 0, isAcidLow: false, recentSales: [], automotiveDuesCount: 0, batteryDuesCount: 0 };
    }
  
    const todayStart = startOfToday();
  
    const lowStockProducts = products.filter(p => p.stock <= p.lowStockThreshold).length;
    const lowStockBatteries = batteries.filter(b => b.stock <= b.lowStockThreshold).length;
    const lowStockCount = lowStockProducts + lowStockBatteries;
  
    const automotiveCustomersWithDues = customers.filter(c => c.type === 'automotive' && c.balance > 0);
    const batteryCustomersWithDues = customers.filter(c => c.type === 'battery' && c.balance > 0);
    
    const automotivePendingPayments = automotiveCustomersWithDues.reduce((acc, c) => acc + c.balance, 0);
    const batteryPendingPayments = batteryCustomersWithDues.reduce((acc, c) => acc + c.balance, 0);
  
    const todaysAutomotiveSales = sales.filter(s => new Date(s.date) >= todayStart);
    const todaysBatterySales = batterySales.filter(s => new Date(s.date) >= todayStart);
  
    const calculateRevenue = (sale: Sale | BatterySale) => {
      if (sale.status === 'Paid') return sale.total;
      if (sale.status === 'Partial') return sale.partialAmountPaid || 0;
      return 0;
    };
  
    const automotiveRevenue = todaysAutomotiveSales.reduce((acc, sale) => acc + calculateRevenue(sale), 0);
    const batteryRevenue = todaysBatterySales.reduce((acc, sale) => acc + calculateRevenue(sale), 0);
    const todaysRevenue = automotiveRevenue + batteryRevenue;
  
    const calculateProfit = (sale: Sale | BatterySale, productsList: (Product | Battery)[]) => {
      const saleCost = sale.items.reduce((itemSum, item) => {
        // For battery sales, ignore scrap items in profit calculation
        if ('type' in item && item.type === 'scrap') {
            return itemSum;
        }
        const productId = 'productId' in item ? item.productId : item.id;
        const product = productsList.find(p => p.id === productId);
        return itemSum + ((product?.costPrice || 0) * item.quantity);
      }, 0);
  
      if (sale.status === 'Paid') return sale.total - saleCost;
      if (sale.status === 'Partial') return (sale.partialAmountPaid || 0) - saleCost;
      return 0 - saleCost; // If unpaid, the cost is still incurred
    };
  
    const automotiveProfit = todaysAutomotiveSales.reduce((acc, sale) => acc + calculateProfit(sale, products), 0);
    const batteryProfit = todaysBatterySales.reduce((acc, sale) => acc + calculateProfit(sale, batteries), 0);
    const todaysProfit = automotiveProfit + batteryProfit;
  
    const isAcidLow = acidStock.totalQuantityKg <= acidStock.lowStockThreshold;

    const allRecentSales = [...sales, ...batterySales]
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  
    return { 
      lowStockCount, 
      automotivePendingPayments,
      batteryPendingPayments,
      todaysRevenue, 
      todaysProfit, 
      isAcidLow, 
      recentSales: allRecentSales,
      automotiveDuesCount: automotiveCustomersWithDues.length,
      batteryDuesCount: batteryCustomersWithDues.length
    };
  }, [sales, batterySales, products, customers, batteries, acidStock]);
  
  const isLoading = salesLoading || batterySalesLoading || productsLoading || customersLoading || batteriesLoading || acidLoading;

  const reportCards = [
    {
      title: "Today's Revenue",
      value: `Rs. ${todaysRevenue.toLocaleString()}`,
      icon: DollarSign,
      change: todaysRevenue > 0 ? 'Received today' : 'No payments yet today',
    },
    {
      title: "Today's Profit",
      value: `Rs. ${todaysProfit.toLocaleString()}`,
      icon: TrendingUp,
      change: todaysProfit > 0 ? 'Profitability is positive' : 'No profit yet today',
    },
    {
      title: 'Low Stock Items',
      value: lowStockCount.toString(),
      icon: Package,
      change: isAcidLow ? <span className="text-destructive font-semibold flex items-center gap-1"><Droplets size={12}/> Acid is low!</span> : `${lowStockCount} items need attention`,
    },
    {
      title: 'Automotive Dues',
      value: `Rs. ${automotivePendingPayments.toLocaleString()}`,
      icon: Car,
      change: `${automotiveDuesCount} customers have dues`,
    },
    {
      title: 'Battery Dues',
      value: `Rs. ${batteryPendingPayments.toLocaleString()}`,
      icon: BatteryIcon,
      change: `${batteryDuesCount} customers have dues`,
    },
  ];


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          A quick overview of your business performance.
        </p>
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => setIsSearchOpen(true)}
                className="w-full max-w-sm text-sm text-muted-foreground bg-background border rounded-md px-4 py-2 flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <span>Search for products, customers, dealers...</span>
                </div>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>
            <Button asChild>
                <Link href="/sales/new">
                    <PlusCircle />
                    New Sale
                </Link>
            </Button>
            <Button asChild>
                <Link href="/purchase/new">
                    <ShoppingBag />
                    New Purchase
                </Link>
            </Button>
             <Button asChild variant="outline">
                <Link href="/repair-jobs/new">
                    <Wrench />
                    New Temp Bill
                </Link>
            </Button>
        </div>
        <MasterSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {isLoading ? Array.from({length: 5}).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-2/3 bg-muted rounded-md animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-1/2 bg-muted rounded-md animate-pulse mb-2" />
              <div className="h-3 w-full bg-muted rounded-md animate-pulse" />
            </CardContent>
          </Card>
        )) : reportCards.map((card, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
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
            <CardTitle>Monthly Sales (Last 6 Months)</CardTitle>
            <CardDescription>
              A summary of your sales over the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>
              Your 5 most recent sales transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                    </TableRow>
                ) : (
                    recentSales?.map((sale) => (
                        <TableRow key={sale.id}>
                            <TableCell>
                            <div className="font-medium">{
                                sale.customer instanceof DocumentReference
                                  ? customers?.find(c => c.id === (sale.customer as DocumentReference).id)?.name || 'Walk-in Customer'
                                  : sale.customer || 'Walk-in Customer'
                              }</div>
                            <div className="text-sm text-muted-foreground hidden sm:inline">
                                {format(new Date(sale.date), 'dd MMM, yyyy')}
                            </div>
                            </TableCell>
                            <TableCell className="text-right">
                            Rs. {sale.total.toLocaleString()}
                            </TableCell>
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
}
