
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
import { MoreHorizontal, Pencil, Trash2, Undo2, PlusCircle, Download } from 'lucide-react';
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
import { collection, getDoc, DocumentReference, runTransaction, doc } from 'firebase/firestore';
import type { Purchase, Dealer } from '@/lib/data';
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
  const purchasesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'purchases') : null, [firestore]);
  const { data: allPurchases, isLoading } = useCollection<Purchase>(purchasesCollection);

  const [enrichedPurchases, setEnrichedPurchases] = useState<EnrichedPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<EnrichedPurchase[]>([]);
  const [purchaseToDelete, setPurchaseToDelete] = useState<EnrichedPurchase | null>(null);
  const { toast } = useToast();

   useEffect(() => {
    if (!allPurchases || !firestore) return;

    const enrichPurchasesData = async () => {
        const enriched = await Promise.all(allPurchases.map(async (purchase) => {
            let dealerName = 'N/A';
            let dealerId = '';

            if (purchase.dealer && purchase.dealer instanceof DocumentReference) {
                try {
                    const dealerSnap = await getDoc(purchase.dealer);
                    if (dealerSnap.exists()) {
                        dealerName = (dealerSnap.data() as Dealer).company;
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
        const purchaseRef = doc(firestore, 'purchases', purchaseToDelete.id);

        for (const item of purchaseToDelete.items) {
          const productRef = doc(firestore, 'products', item.productId);
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists()) {
            const currentStock = productSnap.data().stock || 0;
            transaction.update(productRef, { stock: currentStock - item.quantity });
          }
        }

        if (purchaseToDelete.status !== 'Paid') {
          const dealerRef = doc(firestore, 'dealers', purchaseToDelete.dealer.id);
          const dealerSnap = await transaction.get(dealerRef);
          if (dealerSnap.exists()) {
            const currentBalance = dealerSnap.data().balance || 0;
            transaction.update(dealerRef, { balance: currentBalance - purchaseToDelete.total });
          }
        }
        
        transaction.delete(purchaseRef);
      });

      toast({
        title: "Purchase Deleted",
        description: `Purchase ${purchaseToDelete.invoiceNumber} has been deleted.`,
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
    const headers = ['ID', 'Date', 'Dealer', 'Invoice Number', 'Status', 'Total'];
    const csvContent = [
        headers.join(','),
        ...filteredPurchases.map(p => [
            p.id,
            format(new Date(p.date), 'yyyy-MM-dd HH:mm'),
            `"${p.dealer.name.replace(/"/g, '""')}"`,
            p.invoiceNumber,
            p.status,
            p.total,
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `automotive-purchases-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: 'Your automotive purchases history has been downloaded.' });
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
    <>
    <Card>
       <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Automotive Purchases</CardTitle>
              <CardDescription>History of all parts and supplies purchases.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
                <Button asChild>
                    <Link href="/purchase/new?tab=automotive">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Automotive Purchase
                    </Link>
                </Button>
            </div>
        </CardHeader>
      <CardContent className="pt-0">
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
                This will permanently delete purchase <span className="font-bold">{purchaseToDelete?.invoiceNumber}</span>. This will revert the stock and adjust dealer balance. This action cannot be undone.
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
