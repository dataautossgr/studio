'use client';
import { type Sale } from '@/lib/data';
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
import { format, startOfDay, endOfDay } from 'date-fns';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, getDoc, type DocumentReference } from 'firebase/firestore';

interface EnrichedSale extends Omit<Sale, 'customer'> {
    customer: {
        id: string;
        name: string;
    }
}

export default function AutomotiveSalesHistory() {
  const firestore = useFirestore();
  const salesCollection = useMemoFirebase(() => collection(firestore, 'sales'), [firestore]);
  const { data: allSales, isLoading, error } = useCollection<Sale>(salesCollection);
  
  const [enrichedSales, setEnrichedSales] = useState<EnrichedSale[]>([]);
  
  useEffect(() => {
    if (!allSales) return;

    const enrichSalesData = async () => {
        const enriched = await Promise.all(allSales.map(async (sale) => {
            let customerName = 'Walk-in Customer';
            let customerId = 'walk-in';

            if (sale.customer && typeof sale.customer === 'object' && 'id' in sale.customer) {
                const customerRef = sale.customer as DocumentReference;
                try {
                    const customerSnap = await getDoc(customerRef);
                    if (customerSnap.exists()) {
                        customerName = customerSnap.data().name;
                        customerId = customerSnap.id;
                    }
                } catch(e) {
                    console.error("Error fetching customer", e);
                }
            }
            return {
                ...sale,
                customer: { id: customerId, name: customerName }
            };
        }));
        setEnrichedSales(enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    enrichSalesData();
}, [allSales]);

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
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Date & Time</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading sales...</TableCell>
              </TableRow>
            )}
            {enrichedSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">{sale.invoice}</TableCell>
                <TableCell>{sale.customer.name}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {format(new Date(sale.date), 'dd MMM, yyyy, hh:mm a')}
                </TableCell>
                <TableCell>Rs. {sale.total.toLocaleString()}</TableCell>
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
                          <Link href={`/sales/invoice/${sale.id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Invoice
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                          <Link href={`/sales/${sale.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                          <Undo2 className="mr-2 h-4 w-4" />
                          Return / Exchange
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
