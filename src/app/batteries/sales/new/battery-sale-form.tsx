'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import type { Customer, Battery, BatterySale } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Save, Search } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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

export default function BatterySaleForm() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedBattery, setSelectedBattery] = useState<Battery | null>(null);
  const [manufacturingCode, setManufacturingCode] = useState('');
  const [salePrice, setSalePrice] = useState(0);
  const [scrapWeight, setScrapWeight] = useState(0);
  const [scrapRate, setScrapRate] = useState(0);
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [status, setStatus] = useState<'Paid' | 'Unpaid'>('Paid');

  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const batteriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'batteries') : null, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: batteries, isLoading: batteriesLoading } = useCollection<Battery>(batteriesCollection);

  useEffect(() => {
    if (selectedBattery) {
      setSalePrice(selectedBattery.salePrice);
    }
  }, [selectedBattery]);
  
  const scrapBatteryValue = useMemo(() => scrapWeight * scrapRate, [scrapWeight, scrapRate]);
  const finalAmount = useMemo(() => salePrice - scrapBatteryValue, [salePrice, scrapBatteryValue]);
  const warrantyEndDate = useMemo(() => {
    if (selectedBattery && selectedBattery.warrantyMonths > 0) {
      return addMonths(saleDate, selectedBattery.warrantyMonths);
    }
    return null;
  }, [selectedBattery, saleDate]);


  const handleSave = async () => {
    if (!selectedCustomer || !selectedBattery) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a customer and a battery.',
      });
      return;
    }
    setShowConfirmation(true);
  };
  
  const confirmSave = async () => {
    setShowConfirmation(false);
    setIsSaving(true);
    if (!firestore || !selectedBattery || !selectedCustomer) return;

    const batch = writeBatch(firestore);

    // 1. Create Battery Sale document
    const newSaleRef = doc(collection(firestore, 'battery_sales'));
    const saleData: Omit<BatterySale, 'id'> = {
      customerId: selectedCustomer.id,
      batteryId: selectedBattery.id,
      date: saleDate.toISOString(),
      manufacturingCode,
      salePrice,
      scrapBatteryWeight: scrapWeight,
      scrapBatteryRate: scrapRate,
      scrapBatteryValue: scrapBatteryValue,
      finalAmount,
      warrantyEndDate: warrantyEndDate ? warrantyEndDate.toISOString() : '',
      status,
    };
    batch.set(newSaleRef, saleData);

    // 2. Update battery stock
    const batteryRef = doc(firestore, 'batteries', selectedBattery.id);
    batch.update(batteryRef, { stock: selectedBattery.stock - 1 });

    // 3. Update scrap stock
    if (scrapWeight > 0) {
      const scrapStockRef = doc(firestore, 'scrap_stock', 'main');
      const scrapSnap = await getDoc(scrapStockRef);
      const currentScrap = scrapSnap.exists() ? scrapSnap.data().totalWeightKg : 0;
      batch.set(scrapStockRef, { totalWeightKg: currentScrap + scrapWeight }, { merge: true });
    }

    // 4. Update customer balance if unpaid
    if (status === 'Unpaid') {
      const customerRef = doc(firestore, 'customers', selectedCustomer.id);
      batch.update(customerRef, { balance: (selectedCustomer.balance || 0) + finalAmount });
    }
    
    try {
      await batch.commit();
      toast({
        title: 'Sale Successful',
        description: 'The battery sale has been recorded.',
      });
      router.push('/sales');
    } catch (error) {
      console.error('Error saving battery sale: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'There was a problem saving the sale.',
      });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>New Battery Sale</CardTitle>
          <CardDescription>Create a new sale for batteries, including scrap trade-in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {/* Customer & Date */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Customer</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal text-muted-foreground">
                                {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})` : 'Select a customer...'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search by name or phone..." />
                                <CommandList>
                                    <CommandEmpty>No customers found.</CommandEmpty>
                                    <CommandGroup>
                                        {customers?.filter(c => c.type === 'registered').map((customer) => (
                                            <CommandItem key={customer.id} onSelect={() => {
                                                setSelectedCustomer(customer);
                                                (document.activeElement as HTMLElement)?.blur();
                                            }}>
                                                {customer.name} ({customer.phone})
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label>Sale Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !saleDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {saleDate ? format(saleDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={saleDate} onSelect={(d) => setSaleDate(d || new Date())} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Battery Selection */}
            <div className="space-y-2">
                <Label>Select Battery</Label>
                 <Select onValueChange={(id) => setSelectedBattery(batteries?.find(b => b.id === id) || null)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Choose a battery from stock..." />
                    </SelectTrigger>
                    <SelectContent>
                        {batteries?.filter(b => b.stock > 0).map(battery => (
                            <SelectItem key={battery.id} value={battery.id}>
                                {battery.brand} {battery.model} ({battery.ampere}Ah) - Stock: {battery.stock}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedBattery && (
                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                    {/* New Battery Details */}
                    <div className="space-y-6">
                        <h3 className="font-semibold text-lg text-primary">New Battery Details</h3>
                        <div className="space-y-2">
                            <Label htmlFor="manufacturing-code">Manufacturing Code</Label>
                            <Input id="manufacturing-code" placeholder="Enter unique battery code" value={manufacturingCode} onChange={e => setManufacturingCode(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sale-price">Sale Price (Rs.)</Label>
                            <Input id="sale-price" type="number" value={salePrice} onChange={e => setSalePrice(Number(e.target.value))} />
                        </div>
                         <div className="p-3 bg-muted rounded-md text-sm">
                            <p><strong>Warranty:</strong> {selectedBattery.warrantyMonths} months</p>
                            {warrantyEndDate && <p><strong>Warranty Ends On:</strong> {format(warrantyEndDate, 'dd MMMM, yyyy')}</p>}
                        </div>
                    </div>
                     {/* Scrap Battery Details */}
                    <div className="space-y-6">
                        <h3 className="font-semibold text-lg text-destructive">Scrap Battery Trade-in</h3>
                        <div className="space-y-2">
                            <Label htmlFor="scrap-weight">Scrap Battery Weight (KG)</Label>
                            <Input id="scrap-weight" type="number" placeholder="e.g., 15.5" value={scrapWeight} onChange={e => setScrapWeight(Number(e.target.value))}/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="scrap-rate">Scrap Rate (Rs. per KG)</Label>
                            <Input id="scrap-rate" type="number" placeholder="e.g., 250" value={scrapRate} onChange={e => setScrapRate(Number(e.target.value))}/>
                        </div>
                        <div className="p-3 bg-muted rounded-md text-sm">
                            <p className="font-semibold">Calculated Scrap Value: <span className="font-mono">Rs. {scrapBatteryValue.toLocaleString()}</span></p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Final Calculation */}
            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-2">
                    <Label htmlFor="status">Payment Status</Label>
                    <Select value={status} onValueChange={(v: 'Paid' | 'Unpaid') => setStatus(v)}>
                        <SelectTrigger id="status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Unpaid">Unpaid (Add to Customer Dues)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex flex-col items-end space-y-2">
                    <div className="flex justify-between w-full max-w-xs text-muted-foreground"><span>Sale Price:</span><span className="font-mono">Rs. {salePrice.toLocaleString()}</span></div>
                    <div className="flex justify-between w-full max-w-xs text-muted-foreground"><span>Scrap Deduction:</span><span className="font-mono">- Rs. {scrapBatteryValue.toLocaleString()}</span></div>
                    <div className="flex justify-between w-full max-w-xs text-xl font-bold border-t pt-2 mt-2"><span>Final Amount:</span><span className="font-mono">Rs. {finalAmount.toLocaleString()}</span></div>
                </div>
            </div>

        </CardContent>
        <CardFooter className="flex justify-end">
          <Button size="lg" onClick={handleSave} disabled={isSaving || !selectedBattery || !selectedCustomer}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Battery Sale'}
          </Button>
        </CardFooter>
      </Card>
      
       <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirm Sale Details</AlertDialogTitle>
                <AlertDialogDescription>
                    Please review the details before saving. This action will update stock and cannot be easily undone.
                     <div className="my-4 space-y-1 text-sm text-foreground">
                        <p><strong>Customer:</strong> {selectedCustomer?.name}</p>
                        <p><strong>Battery:</strong> {selectedBattery?.brand} {selectedBattery?.model}</p>
                        <p><strong>Final Amount:</strong> Rs. {finalAmount.toLocaleString()}</p>
                        <p><strong>Status:</strong> {status}</p>
                     </div>
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmSave}>Confirm & Save</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
