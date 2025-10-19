import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { SalesChart } from './sales-chart';

const reportCards = [
    { title: "Today's Sales", value: "Rs. 12,450", icon: DollarSign, change: "+15.2% from yesterday" },
    { title: "Today's Orders", value: "32", icon: ShoppingBag, change: "+8 orders from yesterday" },
    { title: "New Customers", value: "4", icon: Users, change: "+1 from yesterday" },
    { title: "Profit", value: "Rs. 3,120", icon: TrendingUp, change: "+20% from yesterday" },
]

export default function ReportsPage() {
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

        <div className="grid gap-8 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Sales</CardTitle>
                    <CardDescription>A summary of your sales over the last 7 days.</CardDescription>
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
                   <p className="text-sm text-muted-foreground">Report content coming soon.</p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
