'use client';
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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import type { BatteryPurchase, Dealer } from '@/lib/data';
import type { DateRange } from 'react-day-picker';

interface EnrichedPurchase extends Omit<BatteryPurchase, 'dealerId'> {
  dealerName: string;
}

interface BatteryPurchasesHistoryProps {
  dateRange: DateRange | undefined;
}

export default function BatteryPurchasesHistory({ dateRange }: BatteryPurchasesHistoryProps) {
  const firestore = useFirestore();
  const purchasesCollection = useMemoFirebase(() => collection(firestore, 'battery_purchases'), [firestore]);
  const { data: allPurchases, isLoading } = useCollection<BatteryPurchase>(purchasesCollection);

  const [enrichedPurchases, setEnrichedPurchases] = useState<EnrichedPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<EnrichedPurchase[]>([]);
  
   useEffect(() => {
    if (!allPurchases) return;

    const enrichPurchasesData = async () => {
        const enriched = await Promise.all(allPurchases.map(async (purchase) => {
            let dealerName = 'N/A';
            if (purchase.dealerId) {
                const dealerRef = doc(firestore, 'dealers', purchase.dealerId);
                try {
                    const dealerSnap = await getDoc(dealerRef);
                    if (dealerSnap.exists()) {
                        dealerName = (dealerSnap.data() as Dealer).name;
                    }
                } catch(e) {
                    console.error("Error fetching dealer", e);
                }
            }
            return { ...purchase, dealerName };
        }));
        setEnrichedPurchases(enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    enrichPurchasesData();
}, [allPurchases, firestore]);


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


  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
               <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading battery purchases...</TableCell>
              </TableRow>
            )}
            {filteredPurchases.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell>
                  {format(new Date(purchase.date), 'dd MMM, yyyy, hh:mm a')}
                </TableCell>
                <TableCell className="font-medium">{purchase.dealerName}</TableCell>
                <TableCell className="text-right">Rs. {purchase.totalAmount.toLocaleString()}</TableCell>
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
                          <Link href={`/purchase/new?tab=battery&edit=${purchase.id}`}>
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