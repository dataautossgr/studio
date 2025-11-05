'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import {
  MoreHorizontal,
  PlusCircle,
  Trash2,
  Droplets,
  Archive,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, runTransaction } from 'firebase/firestore';
import type { AcidPurchase, AcidStock } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { AcidPurchaseDialog, type AcidPurchaseFormData } from './acid-purchase-dialog';
import { format } from 'date-fns';

export default function AcidInventory() {
  const firestore = useFirestore();
  const acidPurchasesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'acid_purchases') : null, [firestore]);
  const acidStockRef = useMemoFirebase(() => firestore ? doc(firestore, 'acid_stock', 'main') : null, [firestore]);
  
  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<AcidPurchase>(acidPurchasesCollection);
  const { data: acidStock, isLoading: isLoadingStock } = useDoc<AcidStock>(acidStockRef);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<AcidPurchase | null>(null);
  const { toast } = useToast();
  
  const handleSavePurchase = async (data: AcidPurchaseFormData) => {
    if (!firestore || !acidStockRef) return;

    const totalValue = data.quantityKg * data.ratePerKg;

    try {
        await runTransaction(firestore, async (transaction) => {
            const stockDoc = await transaction.get(acidStockRef);
            const currentQuantity = stockDoc.exists() ? stockDoc.data().totalQuantityKg : 0;
            const currentValue = stockDoc.exists() ? stockDoc.data().totalValue : 0;

            const newPurchaseRef = doc(collection(firestore, 'acid_purchases'));
            const newPurchase: Omit<AcidPurchase, 'id'> = {
                date: new Date().toISOString(),
                quantityKg: data.quantityKg,
                ratePerKg: data.ratePerKg,
                totalValue,
                supplier: data.supplier || '',
            };
            transaction.set(newPurchaseRef, newPurchase);
            
            transaction.set(acidStockRef, {
                totalQuantityKg: currentQuantity + data.quantityKg,
                totalValue: currentValue + totalValue
            }, { merge: true });
        });
        
        toast({ title: "Acid Purchase Saved", description: "Acid stock has been updated." });
        setIsDialogOpen(false);

    } catch (e) {
        console.error("Acid purchase transaction failed: ", e);
        toast({ variant: 'destructive', title: "Error", description: "Failed to save acid purchase." });
    }
  };

  const handleDeletePurchase = async () => {
    if (!purchaseToDelete || !firestore || !acidStockRef) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const stockDoc = await transaction.get(acidStockRef);
            const currentQuantity = stockDoc.exists() ? stockDoc.data().totalQuantityKg : 0;
            const currentValue = stockDoc.exists() ? stockDoc.data().totalValue : 0;

            const purchaseRef = doc(firestore, 'acid_purchases', purchaseToDelete.id);
            transaction.delete(purchaseRef);

            transaction.set(acidStockRef, {
                totalQuantityKg: currentQuantity - purchaseToDelete.quantityKg,
                totalValue: currentValue - purchaseToDelete.totalValue,
            }, { merge: true });
        });
        toast({ title: 'Purchase Deleted', description: 'The acid purchase record has been removed and stock updated.' });
        setPurchaseToDelete(null);
    } catch(e) {
        console.error("Error deleting acid purchase: ", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the purchase record.' });
    }
  };


  const isLoading = isLoadingStock || isLoadingPurchases;

  const summaryCards = [
    { title: "Total Acid Stock (KG)", value: `${(acidStock?.totalQuantityKg || 0).toLocaleString()} KG`, icon: Droplets },
    { title: "Total Acid Value (Cost)", value: `Rs. ${(acidStock?.totalValue || 0).toLocaleString()}`, icon: Archive },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
            {isLoading ? Array.from({length: 2}).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 w-2/3 bg-muted rounded-md animate-pulse" />
                    </CardHeader>
                    <CardContent>
                    <div className="h-8 w-1/2 bg-muted rounded-md animate-pulse" />
                    </CardContent>
                </Card>
            )) : summaryCards.map((stat, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Acid Purchase History</CardTitle>
            <CardDescription>Manage your acid stock and purchase records.</CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Acid Purchase
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Quantity (KG)</TableHead>
                <TableHead>Rate (per KG)</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPurchases && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading purchase history...</TableCell>
                </TableRow>
              )}
              {purchases?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>{format(new Date(purchase.date), 'dd MMM, yyyy')}</TableCell>
                  <TableCell className="font-medium">{purchase.supplier || 'N/A'}</TableCell>
                  <TableCell>{purchase.quantityKg} KG</TableCell>
                  <TableCell className="font-mono">Rs. {purchase.ratePerKg.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">Rs. {purchase.totalValue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={() => setPurchaseToDelete(purchase)}
                          className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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
      
      <AcidPurchaseDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSavePurchase}
      />
      
      <AlertDialog open={!!purchaseToDelete} onOpenChange={() => setPurchaseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this purchase record and deduct the quantity/value from the stock. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePurchase}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
