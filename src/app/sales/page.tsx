'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AutomotiveSalesHistory from './automotive-sales-history';
import BatterySalesHistory from '../batteries/sales/battery-sales-history';


export default function SalesPage() {
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
       <Tabs defaultValue="automotive">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
                <p className="text-muted-foreground">
                    View all past transactions for automotive parts and batteries.
                </p>
            </div>
             <div className="flex items-center gap-4">
                <TabsList>
                    <TabsTrigger value="automotive">Automotive</TabsTrigger>
                    <TabsTrigger value="battery">Batteries</TabsTrigger>
                </TabsList>
                 <div className="hidden md:flex items-center gap-2">
                    <Button asChild>
                        <Link href="/sales/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Sale
                        </Link>
                    </Button>
                </div>
            </div>
        </div>

        <TabsContent value="automotive">
            <AutomotiveSalesHistory />
        </TabsContent>
        <TabsContent value="battery">
            <BatterySalesHistory />
        </TabsContent>
    </Tabs>
    </div>
  );
}
