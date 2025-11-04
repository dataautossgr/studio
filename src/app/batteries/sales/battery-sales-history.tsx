'use client';
import { type BatterySale, type Customer } from '@/lib/data';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FileText, Pencil, Trash2, Undo2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, getDoc, doc, type DocumentReference } from 'firebase/firestore';
import type { Battery } from '@/lib/data';

interface EnrichedBatterySale extends Omit<BatterySale, 'customerId' | 'batteryId'> {
    customerName: string;
    batteryInfo: string;
}

export default function BatterySalesHistory() {
  const firestore = useFirestore();
  const salesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'battery_sales') : null, [firestore]);
  const { data: allSales, isLoading } = useCollection<BatterySale>(salesCollection);
  
  const [enrichedSales, setEnrichedSales] = useState<EnrichedBatterySale[]>([]);
  
  useEffect(() => {
    if (!allSales || !firestore) return;

    const enrichSalesData = async () => {
        const enriched = await Promise.all(allSales.map(async (sale) => {
            let customerName = sale.customerName || 'N/A';
            let batteryInfo = 'N/A';

            // If customerName is not on the sale, try to fetch it
            if (!sale.customerName && sale.customerId !== 'walk-in-customer') {
                try {
                    const customerRef = doc(firestore, 'customers', sale.customerId);
                    const customerSnap = await getDoc(customerRef);
                    if (customerSnap.exists()) {
                        customerName = (customerSnap.data() as Customer).name;
                    }
                } catch(e) { console.error("Error fetching customer", e); }
            }

            try {
                 if (sale.batteryId) {
                    const batteryRef = doc(firestore, 'batteries', sale.batteryId);
                    const batterySnap = await getDoc(batteryRef);
                    if (batterySnap.exists()) {
                        const battery = batterySnap.data() as Battery;
                        batteryInfo = `${battery.brand} ${battery.model} (${battery.ampere}Ah)`;
                    }
                }
            } catch(e) {
                console.error("Error enriching battery sale data", e);
            }

            return {
                ...sale,
                customerName: customerName,
                batteryInfo: batteryInfo,
            };
        }));
        setEnrichedSales(enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    enrichSalesData();
}, [allSales, firestore]);

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'Paid':
            return 'default';
        case 'Unpaid':
            return 'destructive';
        default:
            return 'default';
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Battery Sold</TableHead>
              <TableHead>Scrap Value</TableHead>
              <TableHead className="text-right">Final Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading battery sales...</TableCell>
              </TableRow>
            )}
            {enrichedSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  {format(new Date(sale.date), 'dd MMM, yyyy')}
                </TableCell>
                <TableCell className="font-medium">{sale.customerName}</TableCell>
                <TableCell>{sale.batteryInfo}</TableCell>
                <TableCell>Rs. {sale.scrapBatteryValue?.toLocaleString() || 0}</TableCell>
                <TableCell className="text-right">Rs. {sale.finalAmount.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(sale.status)}>{sale.status}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                       <DropdownMenuItem asChild>
                          <Link href={`/batteries/sales/invoice/${sale.id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Invoice
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                          <Link href={`/sales/new?tab=battery&edit=${sale.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
