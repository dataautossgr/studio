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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Trash2,
  BatteryCharging,
  Trash,
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
import { useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Battery, ScrapStock } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { BatteryDialog } from './battery-dialog';
import type { BatteryFormData } from './battery-dialog';
import { useStoreSettings } from '@/context/store-settings-context';


export default function BatteryStockPage() {
  const firestore = useFirestore();
  const { settings } = useStoreSettings();
  const batteriesCollection = useMemoFirebase(() => collection(firestore, 'batteries'), [firestore]);
  const scrapStockRef = useMemoFirebase(() => doc(firestore, 'scrap_stock', 'main'), [firestore]);
  
  const { data: batteries, isLoading: isLoadingBatteries } = useCollection<Battery>(batteriesCollection);
  const { data: scrapStock, isLoading: isLoadingScrap } = useDoc<ScrapStock>(scrapStockRef);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBattery, setSelectedBattery] = useState<Battery | null>(null);
  const [batteryToDelete, setBatteryToDelete] = useState<Battery | null>(null);
  const { toast } = useToast();

  const handleAddBattery = () => {
    setSelectedBattery(null);
    setIsDialogOpen(true);
  };

  const handleEditBattery = (battery: Battery) => {
    setSelectedBattery(battery);
    setIsDialogOpen(true);
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
    setIsDialogOpen(false);
  };

  const handleDeleteBattery = () => {
    if (!batteryToDelete || !firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'batteries', batteryToDelete.id));
    toast({ title: 'Battery Deleted', description: 'The battery has been removed from stock.' });
    setBatteryToDelete(null);
  };

  const totalBatteryStockValue = useMemo(() => {
    return batteries?.reduce((acc, battery) => acc + (battery.costPrice * battery.stock), 0) || 0;
  }, [batteries]);

  const totalScrapValue = useMemo(() => {
    return scrapStock?.totalScrapValue || 0;
  }, [scrapStock]);


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Battery Models</CardTitle>
                <BatteryCharging className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{batteries?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Unique battery models in stock</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Battery Stock Value</CardTitle>
                <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">Rs. {totalBatteryStockValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total cost value of new batteries</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scrap Stock (Weight)</CardTitle>
                <Trash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{(scrapStock?.totalWeightKg || 0).toLocaleString()} KG</div>
                <p className="text-xs text-muted-foreground">Total weight of scrap batteries</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scrap Stock Value</CardTitle>
                <Trash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">Rs. {totalScrapValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Estimated value of scrap stock</p>
            </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Battery Inventory</CardTitle>
            <CardDescription>Manage your new and scrap battery inventory.</CardDescription>
          </div>
          <Button onClick={handleAddBattery}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Battery
          </Button>
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
      
      <BatteryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveBattery}
        battery={selectedBattery}
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
    </div>
  );
}
