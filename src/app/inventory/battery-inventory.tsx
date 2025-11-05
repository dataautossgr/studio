'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
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
import {
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Trash2,
  DollarSign,
  Archive,
  BatteryCharging,
  Droplets,
  MinusCircle,
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
import { useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, runTransaction } from 'firebase/firestore';
import type { Battery, ScrapStock, ScrapPurchase, AcidPurchase, AcidStock } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { BatteryDialog } from './battery-dialog';
import type { BatteryFormData } from './battery-dialog';
import { ScrapPurchaseDialog, type ScrapPurchaseFormData } from './scrap-purchase-dialog';
import { AcidPurchaseDialog, type AcidPurchaseFormData } from './acid-purchase-dialog';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


export default function BatteryInventory() {
  const firestore = useFirestore();
  const batteriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'batteries') : null, [firestore]);
  const scrapStockRef = useMemoFirebase(() => firestore ? doc(firestore, 'scrap_stock', 'main') : null, [firestore]);
  const acidPurchasesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'acid_purchases') : null, [firestore]);
  const acidStockRef = useMemoFirebase(() => firestore ? doc(firestore, 'acid_stock', 'main') : null, [firestore]);
  
  const { data: batteries, isLoading: isLoadingBatteries } = useCollection<Battery>(batteriesCollection);
  const { data: scrapStock, isLoading: isLoadingScrap } = useDoc<ScrapStock>(scrapStockRef);
  const { data: acidPurchases, isLoading: isLoadingAcidPurchases } = useCollection<AcidPurchase>(acidPurchasesCollection);
  const { data: acidStock, isLoading: isLoadingAcidStock } = useDoc<AcidStock>(acidStockRef);
  
  const [isBatteryDialogOpen, setIsBatteryDialogOpen] = useState(false);
  const [isScrapDialogOpen, setIsScrapDialogOpen] = useState(false);
  const [isAcidDialogOpen, setIsAcidDialogOpen] = useState(false);
  
  const [acidConsumption, setAcidConsumption] = useState(0);
  const [consumptionNotes, setConsumptionNotes] = useState('');

  const [selectedBattery, setSelectedBattery] = useState<Battery | null>(null);
  const [batteryToDelete, setBatteryToDelete] = useState<Battery | null>(null);
  const [acidPurchaseToDelete, setAcidPurchaseToDelete] = useState<AcidPurchase | null>(null);
  const { toast } = useToast();

  const { totalSaleValue, totalCostValue } = useMemo(() => {
    if (!batteries) return { totalSaleValue: 0, totalCostValue: 0 };
    const cost = batteries.reduce((acc, b) => acc + (b.costPrice * b.stock), 0);
    const sale = batteries.reduce((acc, b) => acc + (b.salePrice * b.stock), 0);
    return { totalSaleValue: sale, totalCostValue: cost };
  }, [batteries]);

  const handleAddBattery = () => {
    setSelectedBattery(null);
    setIsBatteryDialogOpen(true);
  };

  const handleEditBattery = (battery: Battery) => {
    setSelectedBattery(battery);
    setIsBatteryDialogOpen(true);
  };
  
  const handleSaveBattery = (batteryData: BatteryFormData) => {
    if (!firestore) return;

    if (selectedBattery) {
      const batteryRef = doc(firestore, 'batteries', selectedBattery.id);
      setDocumentNonBlocking(batteryRef, batteryData, { merge: true });
      toast({ title: 'Success', description: 'Battery details updated successfully.' });
    } else {
      addDocumentNonBlocking(collection(firestore, 'batteries'), batteryData);
      toast({ title: 'Success', description: 'New battery added to stock.' });
    }
    setIsBatteryDialogOpen(false);
  };

  const handleDeleteBattery = () => {
    if (!batteryToDelete || !firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'batteries', batteryToDelete.id));
    toast({ title: 'Battery Deleted', description: 'The battery has been removed from stock.' });
    setBatteryToDelete(null);
  };
  
  const handleSaveScrapPurchase = async (data: ScrapPurchaseFormData) => {
    if (!firestore || !scrapStockRef) return;

    const totalValue = data.weightKg * data.ratePerKg;

    try {
        await runTransaction(firestore, async (transaction) => {
            const scrapStockDoc = await transaction.get(scrapStockRef);
            const currentWeight = scrapStockDoc.exists() ? scrapStockDoc.data().totalWeightKg : 0;
            const currentValue = scrapStockDoc.exists() ? scrapStockDoc.data().totalScrapValue : 0;

            const newScrapPurchaseRef = doc(collection(firestore, 'scrap_purchases'));
            const purchaseRecord: Omit<ScrapPurchase, 'id'> = {
                date: new Date().toISOString(),
                sellerName: data.sellerName,
                sellerAddress: data.sellerAddress,
                sellerNIC: data.sellerNIC,
                weightKg: data.weightKg,
                ratePerKg: data.ratePerKg,
                totalValue: totalValue,
            };
            transaction.set(newScrapPurchaseRef, purchaseRecord);

            transaction.set(scrapStockRef, {
                totalWeightKg: currentWeight + data.weightKg,
                totalScrapValue: currentValue + totalValue,
            }, { merge: true });
        });
        
        toast({ title: "Scrap Purchase Saved", description: "Scrap stock has been updated." });
        setIsScrapDialogOpen(false);

    } catch (e) {
        console.error("Scrap purchase transaction failed: ", e);
        toast({ variant: 'destructive', title: "Error", description: "Failed to save scrap purchase." });
    }
  };

  const handleSaveAcidPurchase = async (data: AcidPurchaseFormData) => {
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
        setIsAcidDialogOpen(false);

    } catch (e) {
        console.error("Acid purchase transaction failed: ", e);
        toast({ variant: 'destructive', title: "Error", description: "Failed to save acid purchase." });
    }
  };

  const handleDeleteAcidPurchase = async () => {
    if (!acidPurchaseToDelete || !firestore || !acidStockRef) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const stockDoc = await transaction.get(acidStockRef);
            const currentQuantity = stockDoc.exists() ? stockDoc.data().totalQuantityKg : 0;
            const currentValue = stockDoc.exists() ? stockDoc.data().totalValue : 0;

            const purchaseRef = doc(firestore, 'acid_purchases', acidPurchaseToDelete.id);
            transaction.delete(purchaseRef);

            transaction.set(acidStockRef, {
                totalQuantityKg: currentQuantity - acidPurchaseToDelete.quantityKg,
                totalValue: currentValue - acidPurchaseToDelete.totalValue,
            }, { merge: true });
        });
        toast({ title: 'Purchase Deleted', description: 'The acid purchase record has been removed and stock updated.' });
        setAcidPurchaseToDelete(null);
    } catch(e) {
        console.error("Error deleting acid purchase: ", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the purchase record.' });
    }
  };
  
  const handleRecordConsumption = async () => {
    if (!firestore || !acidStockRef || acidConsumption <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Quantity', description: 'Please enter a valid quantity to consume.' });
        return;
    }
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const stockDoc = await transaction.get(acidStockRef);
            const currentQuantity = stockDoc.exists() ? stockDoc.data().totalQuantityKg : 0;
            
            if (acidConsumption > currentQuantity) {
                throw new Error("Consumption quantity cannot be greater than available stock.");
            }

            const newConsumptionRef = doc(collection(firestore, 'acid_consumption'));
            transaction.set(newConsumptionRef, {
                date: new Date().toISOString(),
                quantityKg: acidConsumption,
                notes: consumptionNotes,
            });

            transaction.update(acidStockRef, {
                totalQuantityKg: currentQuantity - acidConsumption
            });
        });
        
        toast({ title: 'Consumption Recorded', description: `${acidConsumption} KG of acid has been deducted from stock.` });
        setAcidConsumption(0);
        setConsumptionNotes('');
    } catch (e: any) {
        console.error("Acid consumption transaction failed: ", e);
        toast({ variant: 'destructive', title: "Error", description: e.message || "Failed to record acid consumption." });
    }
  };

  const isLoading = isLoadingBatteries || isLoadingScrap || isLoadingAcidStock || isLoadingAcidPurchases;

  const summaryCards = [
    { title: "Battery Value (Sale)", value: `Rs. ${totalSaleValue.toLocaleString()}`, icon: DollarSign },
    { title: "Battery Value (Cost)", value: `Rs. ${totalCostValue.toLocaleString()}`, icon: Archive },
    { title: "Scrap Stock (Weight)", value: `${(scrapStock?.totalWeightKg || 0).toLocaleString()} KG`, icon: BatteryCharging },
    { title: "Acid Stock (KG)", value: `${(acidStock?.totalQuantityKg || 0).toLocaleString()} KG`, icon: Droplets },
  ];

  return (
    <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? Array.from({length: 4}).map((_, i) => (
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
            <CardTitle>Battery Inventory</CardTitle>
            <CardDescription>Manage your new battery stock.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsScrapDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Scrap Purchase
            </Button>
            <Button onClick={handleAddBattery}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Battery
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand & Model</TableHead>
                <TableHead>Ampere</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Sale Price</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingBatteries && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading battery stock...</TableCell>
                </TableRow>
              )}
              {batteries?.map((battery) => (
                <TableRow key={battery.id}>
                  <TableCell className="font-medium">{battery.brand} {battery.model}</TableCell>
                  <TableCell>{battery.ampere} Ah</TableCell>
                  <TableCell><Badge variant="outline">{battery.type}</Badge></TableCell>
                  <TableCell className="text-right font-mono">Rs. {battery.costPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">Rs. {battery.salePrice.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-bold">{battery.stock}</TableCell>
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
                        <DropdownMenuItem onSelect={() => handleEditBattery(battery)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setBatteryToDelete(battery)}
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
      
        <div className="grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Acid Purchase History</CardTitle>
                    <CardDescription>Manage your acid stock and purchase records.</CardDescription>
                </div>
                <Button onClick={() => setIsAcidDialogOpen(true)}>
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
                        <TableHead>Qty (KG)</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead>
                        <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoadingAcidPurchases && (
                        <TableRow>
                        <TableCell colSpan={5} className="text-center">Loading purchase history...</TableCell>
                        </TableRow>
                    )}
                    {acidPurchases?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((purchase) => (
                        <TableRow key={purchase.id}>
                        <TableCell>{format(new Date(purchase.date), 'dd MMM, yyyy')}</TableCell>
                        <TableCell className="font-medium">{purchase.supplier || 'N/A'}</TableCell>
                        <TableCell>{purchase.quantityKg} KG</TableCell>
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
                                onSelect={() => setAcidPurchaseToDelete(purchase)}
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

            <Card>
                <CardHeader>
                    <CardTitle>Manage Acid Consumption</CardTitle>
                    <CardDescription>Record acid used for charging or other purposes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="consumption-qty">Consumed Quantity (KG)</Label>
                        <Input 
                            id="consumption-qty" 
                            type="number" 
                            value={acidConsumption} 
                            onChange={(e) => setAcidConsumption(Number(e.target.value))}
                            placeholder="e.g., 5.5"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="consumption-notes">Notes (Optional)</Label>
                        <Input 
                            id="consumption-notes" 
                            value={consumptionNotes} 
                            onChange={(e) => setConsumptionNotes(e.target.value)}
                            placeholder="e.g., Used for 10 batteries charging"
                        />
                     </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleRecordConsumption} disabled={acidConsumption <= 0}>
                        <MinusCircle className="mr-2 h-4 w-4" />
                        Record Consumption
                    </Button>
                </CardFooter>
            </Card>
        </div>


      <BatteryDialog
        isOpen={isBatteryDialogOpen}
        onClose={() => setIsBatteryDialogOpen(false)}
        onSave={handleSaveBattery}
        battery={selectedBattery}
      />

      <ScrapPurchaseDialog
        isOpen={isScrapDialogOpen}
        onClose={() => setIsScrapDialogOpen(false)}
        onSave={handleSaveScrapPurchase}
      />

      <AcidPurchaseDialog
        isOpen={isAcidDialogOpen}
        onClose={() => setIsAcidDialogOpen(false)}
        onSave={handleSaveAcidPurchase}
      />
      
      <AlertDialog open={!!batteryToDelete} onOpenChange={() => setBatteryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the battery "{batteryToDelete?.brand} {batteryToDelete?.model}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBattery}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!acidPurchaseToDelete} onOpenChange={() => setAcidPurchaseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this purchase record and deduct the quantity/value from the stock. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAcidPurchase}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
