'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { MoreHorizontal, Pencil, Trash2, Undo2 } from 'lucide-react';
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
import { collection, getDoc, type DocumentReference } from 'firebase/firestore';
import type { Purchase, Dealer } from '@/lib/data';
import type { DateRange } from 'react-day-picker';

interface EnrichedPurchase extends Omit<Purchase, 'dealer'> {
  dealer: {
    id: string;
    name: string;
  }
}

interface AutomotivePurchasesHistoryProps {
  dateRange: DateRange | undefined;
}

export default function AutomotivePurchasesHistory({ dateRange }: AutomotivePurchasesHistoryProps) {
  const firestore = useFirestore();
  const purchasesCollection = useMemoFirebase(() => collection(firestore, 'purchases'), [firestore]);
  const { data: allPurchases, isLoading } = useCollection<Purchase>(purchasesCollection);

  const [enrichedPurchases, setEnrichedPurchases] = useState<EnrichedPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<EnrichedPurchase[]>([]);

   useEffect(() => {
    if (!allPurchases) return;

    const enrichPurchasesData = async () => {
        const enriched = await Promise.all(allPurchases.map(async (purchase) => {
            let dealerName = 'N/A';
            let dealerId = '';

            if (purchase.dealer && typeof purchase.dealer === 'object' && 'id' in purchase.dealer) {
                const dealerRef = purchase.dealer as DocumentReference;
                try {
                    const dealerSnap = await getDoc(dealerRef);
                    if (dealerSnap.exists()) {
                        dealerName = (dealerSnap.data() as Dealer).name;
                        dealerId = dealerSnap.id;
                    }
                } catch(e) {
                    console.error("Error fetching dealer", e);
                }
            }
            return {
                ...purchase,
                dealer: { id: dealerId, name: dealerName }
            };
        }));
        setEnrichedPurchases(enriched);
    };

    enrichPurchasesData();
}, [allPurchases]);


  useEffect(() => {
    if (dateRange?.from) {
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        const filtered = enrichedPurchases.filter(purchase => {
            const purchaseDate = new Date(purchase.date);
            return purchaseDate >= from && purchaseDate <= to;
        });
        setFilteredPurchases(filtered);
    } else {
        setFilteredPurchases(enrichedPurchases);
    }
  }, [dateRange, enrichedPurchases]);


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
              <TableHead>Date & Time</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
               <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading purchases...</TableCell>
              </TableRow>
            )}
            {filteredPurchases.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell className="hidden md:table-cell">
                  {format(new Date(purchase.date), 'dd MMM, yyyy, hh:mm a')}
                </TableCell>
                <TableCell>{purchase.dealer.name}</TableCell>
                <TableCell className="font-medium">{purchase.invoiceNumber}</TableCell>
                <TableCell className="text-right">Rs. {purchase.total.toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusVariant(purchase.status)}>{purchase.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
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
                          <Link href={`/purchase/${purchase.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                          <Undo2 className="mr-2 h-4 w-4" />
                          Return Items
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
