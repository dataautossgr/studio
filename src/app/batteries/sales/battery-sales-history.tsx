'use client';
import { type BatterySale, type Customer } from '@/lib/data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import { MoreHorizontal, FileText, Pencil, Trash2, Undo2, PlusCircle, Download } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { format, startOfDay, endOfDay } from 'date-fns';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, getDoc, doc, DocumentReference } from 'firebase/firestore';
import type { Battery } from '@/lib/data';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';


interface EnrichedBatterySale extends Omit<BatterySale, 'customer'> {
    customerName: string;
}

interface BatterySalesHistoryProps {
  dateRange: DateRange | undefined;
}


export default function BatterySalesHistory({ dateRange }: BatterySalesHistoryProps) {
  const firestore = useFirestore();
  const salesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'battery_sales') : null, [firestore]);
  const { data: allSales, isLoading } = useCollection<BatterySale>(salesCollection);
  
  const [enrichedSales, setEnrichedSales] = useState<EnrichedBatterySale[]>([]);
  const [filteredSales, setFilteredSales] = useState<EnrichedBatterySale[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!allSales || !firestore) return;

    const enrichSalesData = async () => {
        const enriched = await Promise.all(allSales.map(async (sale) => {
            let customerName = 'Walk-in Customer';

            if (sale.customer && sale.customer instanceof DocumentReference) {
                try {
                    const customerSnap = await getDoc(sale.customer);
                    if (customerSnap.exists()) {
                        customerName = (customerSnap.data() as Customer).name;
                    }
                } catch(e) { console.error("Error fetching customer", e); }
            } else if (typeof sale.customer === 'string') {
                // This is for backward compatibility or if customer is just a name
                customerName = sale.customer;
            }

            return {
                ...sale,
                customerName: customerName,
            };
        }));
        setEnrichedSales(enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    enrichSalesData();
}, [allSales, firestore]);

  useEffect(() => {
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      const filtered = enrichedSales.filter((sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= from && saleDate <= to;
      });
      setFilteredSales(filtered);
    } else {
      setFilteredSales(enrichedSales);
    }
  }, [dateRange, enrichedSales]);
  
  const handleExport = () => {
    if (filteredSales.length === 0) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'No sales data in the selected range to export.' });
        return;
    }
    const headers = ['Invoice', 'Date', 'Customer', 'Status', 'Payment Method', 'Total', 'Discount', 'Partial Paid'];
    const csvContent = [
        headers.join(','),
        ...filteredSales.map(s => [
            s.invoice,
            format(new Date(s.date), 'yyyy-MM-dd HH:mm'),
            `"${s.customerName.replace(/"/g, '""')}"`,
            s.status,
            s.paymentMethod || 'N/A',
            s.total,
            s.discount || 0,
            s.partialAmountPaid || 0
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `battery-sales-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: 'Your battery sales history has been downloaded.' });
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'Paid':
            return 'default';
        case 'Unpaid':
            return 'destructive';
        case 'Partial':
            return 'secondary';
        default:
            return 'default';
    }
  }

  return (
    <Card>
       <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Battery Sales</CardTitle>
            <CardDescription>History of all battery and related sales.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button asChild>
                <Link href="/sales/new?tab=battery">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Battery Sale
                </Link>
            </Button>
          </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
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
                  <TableCell colSpan={6} className="text-center">Loading battery sales...</TableCell>
              </TableRow>
            )}
            {filteredSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">{sale.invoice}</TableCell>
                <TableCell className="font-medium">{sale.customerName}</TableCell>
                <TableCell>
                  {format(new Date(sale.date), 'dd MMM, yyyy')}
                </TableCell>
                <TableCell className="text-right">Rs. {sale.total.toLocaleString()}</TableCell>
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

    