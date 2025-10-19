import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CreditCard, DollarSign, Package, TrendingUp, Users } from 'lucide-react';
import { SalesChart } from '@/app/reports/sales-chart';
import { getSales, getProducts } from '@/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default async function DashboardPage() {
  const sales = (await getSales()).slice(0, 5);
  const products = await getProducts();
  const lowStockCount = products.filter(p => p.stock <= p.lowStockThreshold).length;

  const reportCards = [
    {
      title: "Today's Revenue",
      value: 'Rs. 0',
      icon: DollarSign,
      change: 'No sales yet today',
    },
    {
      title: "Today's Profit",
      value: 'Rs. 0',
      icon: TrendingUp,
      change: 'No sales yet today',
    },
    {
      title: "Today's Expenses",
      value: 'Rs. 0',
      icon: CreditCard,
      change: 'No expenses recorded',
    },
    {
      title: 'Low Stock Items',
      value: lowStockCount.toString(),
      icon: Package,
      change: lowStockCount > 0 ? `${lowStockCount} items need attention` : 'All items are in stock',
    },
    {
      title: 'Pending Payments',
      value: 'Rs. 0',
      icon: Users,
      change: 'No pending payments',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          A quick overview of your business performance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {reportCards.map((card, i) => (
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
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="font-medium">{sale.customer.name}</div>
                      <div className="text-sm text-muted-foreground hidden sm:inline">
                        {format(new Date(sale.date), 'dd MMM, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      Rs. {sale.total.toLocaleString()}
                    </TableCell>
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
