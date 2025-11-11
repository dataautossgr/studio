
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CreditCard, DollarSign, Package, TrendingUp, Users, Search, Wrench, PlusCircle, Droplets, ShoppingBag, Car, Battery as BatteryIcon, Wallet } from 'lucide-react';
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
import { collection, DocumentReference, doc, query, where } from 'firebase/firestore';
import type { Sale, Product, Customer, Battery, AcidStock, BatterySale, Payment } from '@/lib/data';
import { MasterSearchDialog } from '@/components/master-search-dialog';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Expense } from '@/app/expenses/page';
import { Skeleton } from '@/components/ui/skeleton';


export default function DashboardPage() {
  const firestore = useFirestore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const salesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'sales'): null, [firestore]);
  const batterySalesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'battery_sales'): null, [firestore]);
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const batteriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'batteries') : null, [firestore]);
  const acidStockRef = useMemoFirebase(() => firestore ? doc(firestore, 'acid_stock', 'main') : null, [firestore]);
  
  const todayStart = startOfToday();
  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'payments'), where('date', '>=', todayStart.toISOString())) : null, [firestore]);
  const expensesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'expenses'), where('date', '>=', todayStart.toISOString())) : null, [firestore]);


  const { data: salesData, isLoading: salesLoading } = useCollection<Sale>(salesCollection);
  const { data: batterySalesData, isLoading: batterySalesLoading } = useCollection<BatterySale>(batterySalesCollection);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: batteries, isLoading: batteriesLoading } = useCollection<Battery>(batteriesCollection);
  const { data: acidStock, isLoading: acidLoading } = useDoc<AcidStock>(acidStockRef);
  const { data: todayPayments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);
  const { data: todayExpenses, isLoading: expensesLoading } = useCollection<Expense>(expensesQuery);


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

  const isLoading = salesLoading || batterySalesLoading || productsLoading || customersLoading || batteriesLoading || acidLoading || paymentsLoading || expensesLoading;
  
  const dashboardStats = useMemo(() => {
    if (!salesData || !batterySalesData || !products || !customers || !batteries || !todayPayments || !todayExpenses) {
        return {
            lowStockCount: 0, automotivePendingPayments: 0, batteryPendingPayments: 0,
            todaysRevenue: 0, todaysCashIn: 0, todaysOnlineIn: 0, isAcidLow: false, recentSales: [],
            automotiveDuesCount: 0, batteryDuesCount: 0
        };
    }
  
    const todayStart = startOfToday();
    const todaysAutomotiveSales = salesData.filter(s => new Date(s.date) >= todayStart);
    const todaysBatterySales = batterySalesData.filter(s => new Date(s.date) >= todayStart);
  
    const lowStockProducts = products.filter(p => p.stock <= p.lowStockThreshold).length;
    const lowStockBatteries = batteries.filter(b => b.stock <= b.lowStockThreshold).length;
    const lowStockCount = lowStockProducts + lowStockBatteries;
    const isAcidLow = acidStock ? acidStock.totalQuantityKg <= acidStock.lowStockThreshold : false;
  
    const automotiveCustomersWithDues = customers.filter(c => c.type === 'automotive' && c.balance > 0);
    const batteryCustomersWithDues = customers.filter(c => c.type === 'battery' && c.balance > 0);
    const automotivePendingPayments = automotiveCustomersWithDues.reduce((acc, c) => acc + c.balance, 0);
    const batteryPendingPayments = batteryCustomersWithDues.reduce((acc, c) => acc + c.balance, 0);

    const automotiveRevenue = todaysAutomotiveSales.reduce((acc, sale) => acc + sale.total, 0);
    const batteryRevenue = todaysBatterySales.reduce((acc, sale) => acc + sale.total, 0);
    const todaysRevenue = automotiveRevenue + batteryRevenue;
  
    const getPaymentFromSale = (sale: Sale | BatterySale, method: 'cash' | 'online') => {
        if (sale.paymentMethod !== method) return 0;
        if (sale.status === 'Paid') return sale.total;
        if (sale.status === 'Partial') return sale.partialAmountPaid || 0;
        return 0;
    };

    const cashFromAutomotiveSales = todaysAutomotiveSales.reduce((acc, sale) => acc + getPaymentFromSale(sale, 'cash'), 0);
    const cashFromBatterySales = todaysBatterySales.reduce((acc, sale) => acc + getPaymentFromSale(sale, 'cash'), 0);
    const cashFromDues = todayPayments.filter(p => p.paymentMethod === 'Cash').reduce((acc, p) => acc + p.amount, 0);
    const cashFromExpenses = todayExpenses.filter(e => e.paymentMethod === 'Cash').reduce((acc, e) => acc + e.amount, 0);
    const todaysCashIn = cashFromAutomotiveSales + cashFromBatterySales + cashFromDues - cashFromExpenses;
    
    const onlineFromAutomotiveSales = todaysAutomotiveSales.reduce((acc, sale) => acc + getPaymentFromSale(sale, 'online'), 0);
    const onlineFromBatterySales = todaysBatterySales.reduce((acc, sale) => acc + getPaymentFromSale(sale, 'online'), 0);
    const onlineFromDues = todayPayments.filter(p => p.paymentMethod === 'Online').reduce((acc, p) => acc + p.amount, 0);
    const todaysOnlineIn = onlineFromAutomotiveSales + onlineFromBatterySales + onlineFromDues;

    const allRecentSales = [...salesData, ...batterySalesData]
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  
    return { 
      lowStockCount, 
      automotivePendingPayments,
      batteryPendingPayments,
      todaysRevenue, 
      todaysCashIn,
      todaysOnlineIn, 
      isAcidLow, 
      recentSales: allRecentSales,
      automotiveDuesCount: automotiveCustomersWithDues.length,
      batteryDuesCount: batteryCustomersWithDues.length
    };
  }, [salesData, batterySalesData, products, customers, batteries, acidStock, todayPayments, todayExpenses]);


  const { todaysRevenue, todaysCashIn, todaysOnlineIn, lowStockCount, isAcidLow, automotivePendingPayments, batteryPendingPayments, automotiveDuesCount, batteryDuesCount, recentSales } = dashboardStats;

  const reportCards = [
    {
      title: "Today's Revenue",
      value: `Rs. ${todaysRevenue.toLocaleString()}`,
      icon: DollarSign,
      change: 'Total value of goods sold today',
    },
    {
      title: "Today's Net Cash In",
      value: `Rs. ${todaysCashIn.toLocaleString()}`,
      icon: Wallet,
      change: 'Cash sales + dues received - cash expenses',
    },
    {
      title: "Today's Online In",
      value: `Rs. ${todaysOnlineIn.toLocaleString()}`,
      icon: CreditCard,
      change: 'Online sales + dues received',
    },
    {
      title: 'Low Stock Items',
      value: lowStockCount.toString(),
      icon: Package,
      change: isAcidLow ? <span className="text-destructive font-semibold flex items-center gap-1"><Droplets size={12}/> Acid is low!</span> : `${lowStockCount} items need attention`,
      href: '/low-stock',
    },
    {
      title: 'Automotive Dues',
      value: `Rs. ${automotivePendingPayments.toLocaleString()}`,
      icon: Car,
      change: `${automotiveDuesCount} customers have dues`,
      href: '/customers',
    },
    {
      title: 'Battery Dues',
      value: `Rs. ${batteryPendingPayments.toLocaleString()}`,
      icon: BatteryIcon,
      change: `${batteryDuesCount} customers have dues`,
      href: '/customers',
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading ? Array.from({length: 6}).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/2 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        )) : reportCards.map((card, i) => (
          <Card key={i} className="hover:bg-muted/50 transition-colors">
            <Link href={card.href || '#'}>
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
            </Link>
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
                    Array.from({length: 5}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-16" /></TableCell>
                        </TableRow>
                    ))
                ) : (
                    recentSales?.map((sale) => (
                        <TableRow key={sale.id}>
                            <TableCell>
                            <div className="font-medium">{
                                sale.customer instanceof DocumentReference && customers
                                  ? customers.find(c => c.id === (sale.customer as DocumentReference).id)?.name || 'Walk-in Customer'
                                  : typeof sale.customer === 'string' ? sale.customer : 'Walk-in Customer'
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
