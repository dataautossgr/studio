
'use client';
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
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2, Download, PlusCircle } from 'lucide-react';
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
import { collection, doc, getDoc, runTransaction } from 'firebase/firestore';
import type { BatteryPurchase, Dealer } from '@/lib/data';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface EnrichedPurchase extends BatteryPurchase {
  dealerName: string;
}

interface BatteryPurchasesHistoryProps {
  dateRange: DateRange | undefined;
}

export default function BatteryPurchasesHistory({ dateRange }: BatteryPurchasesHistoryProps) {
  const firestore = useFirestore();
  const purchasesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'battery_purchases') : null, [firestore]);
  const { data: allPurchases, isLoading } = useCollection<BatteryPurchase>(purchasesCollection);

  const [enrichedPurchases, setEnrichedPurchases] = useState<EnrichedPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<EnrichedPurchase[]>([]);
  const [purchaseToDelete, setPurchaseToDelete] = useState<EnrichedPurchase | null>(null);
  const { toast } = useToast();
  
   useEffect(() => {
    if (!allPurchases || !firestore) return;

    const enrichPurchasesData = async () => {
        const enriched = await Promise.all(allPurchases.map(async (purchase) => {
            let dealerName = 'N/A';
            if (purchase.dealerId) {
                try {
                    const dealerRef = doc(firestore, 'dealers', purchase.dealerId);
                    const dealerSnap = await getDoc(dealerRef);
                    if (dealerSnap.exists()) {
                        dealerName = (dealerSnap.data() as Dealer).company;
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
  
  const handleDeletePurchase = async () => {
    if (!purchaseToDelete || !firestore) return;
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const purchaseRef = doc(firestore, 'battery_purchases', purchaseToDelete.id);

        for (const item of purchaseToDelete.items) {
          const productRef = doc(firestore, 'batteries', item.batteryId);
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists()) {
            const currentStock = productSnap.data().stock || 0;
            transaction.update(productRef, { stock: currentStock - item.quantity });
          }
        }
        
        transaction.delete(purchaseRef);
      });

      toast({
        title: "Purchase Deleted",
        description: `Battery purchase record has been deleted.`,
      });
    } catch (e) {
      console.error("Error deleting purchase:", e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete purchase.' });
    }
    setPurchaseToDelete(null);
  };
  
  const handleExport = () => {
    if (filteredPurchases.length === 0) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'No purchase data in the selected range to export.' });
        return;
    }
    const headers = ['ID', 'Date', 'Dealer', 'Total'];
    const csvContent = [
        headers.join(','),
        ...filteredPurchases.map(p => [
            p.id,
            format(new Date(p.date), 'yyyy-MM-dd HH:mm'),
            `"${p.dealerName.replace(/"/g, '""')}"`,
            p.totalAmount,
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `battery-purchases-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: 'Your battery purchases history has been downloaded.' });
  };


  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Battery Purchases</CardTitle>
              <CardDescription>History of all battery stock purchases.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
                <Button asChild>
                    <Link href="/purchase/new?tab=battery">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Battery Purchase
                    </Link>
                </Button>
            </div>
        </CardHeader>
      <CardContent className="pt-0">
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
                      <DropdownMenuItem onSelect={() => setPurchaseToDelete(purchase)} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
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
    <AlertDialog open={!!purchaseToDelete} onOpenChange={() => setPurchaseToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This will permanently delete this purchase. This will revert the stock changes made by this purchase. This action cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePurchase}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
