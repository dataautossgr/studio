'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import type { Customer, Battery, BatterySale } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Save, Search, UserPlus } from 'lucide-react';
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
import { CustomerDialog } from '@/app/customers/customer-dialog';
import { Checkbox } from '@/components/ui/checkbox';

export default function BatterySaleForm() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerType, setCustomerType] = useState<'walk-in' | 'registered'>('walk-in');
  const [walkInCustomerName, setWalkInCustomerName] = useState('');

  const [selectedBattery, setSelectedBattery] = useState<Battery | null>(null);
  const [manufacturingCode, setManufacturingCode] = useState('');
  const [salePrice, setSalePrice] = useState(0);
  const [scrapWeight, setScrapWeight] = useState(0);
  const [scrapRate, setScrapRate] = useState(0);
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [status, setStatus] = useState<'Paid' | 'Unpaid'>('Paid');
  
  const [addChargingService, setAddChargingService] = useState(false);
  const [chargingServiceAmount, setChargingServiceAmount] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();

  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const batteriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'batteries') : null, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: batteries, isLoading: batteriesLoading } = useCollection<Battery>(batteriesCollection);
  
  const editId = searchParams.get('edit');

  useEffect(() => {
    if (editId && firestore && batteries && customers) {
        const fetchSaleData = async () => {
            const saleRef = doc(firestore, 'battery_sales', editId);
            const saleSnap = await getDoc(saleRef);
            if(saleSnap.exists()) {
                const saleData = saleSnap.data() as BatterySale;
                
                const customerSnap = await getDoc(doc(firestore, 'customers', saleData.customerId));
                 if(customerSnap.exists()){
                    const customerData = { id: customerSnap.id, ...customerSnap.data() } as Customer;
                    setSelectedCustomer(customerData);
                    setCustomerType(customerData.type || 'registered');
                    if(customerData.type === 'walk-in') {
                        setWalkInCustomerName(customerData.name);
                    }
                }

                if (saleData.batteryId) {
                  const battery = batteries.find(b => b.id === saleData.batteryId);
                  setSelectedBattery(battery || null);
                }
                
                setManufacturingCode(saleData.manufacturingCode || '');
                setSalePrice(saleData.salePrice || 0);
                setScrapWeight(saleData.scrapBatteryWeight || 0);
                setScrapRate(saleData.scrapBatteryRate || 0);
                setSaleDate(new Date(saleData.date));
                setStatus(saleData.status);
                if (saleData.chargingServiceAmount && saleData.chargingServiceAmount > 0) {
                    setAddChargingService(true);
                    setChargingServiceAmount(saleData.chargingServiceAmount);
                }
            }
        };
        fetchSaleData();
    }
  }, [editId, firestore, batteries, customers]);


  useEffect(() => {
    if (selectedBattery) {
      setSalePrice(selectedBattery.salePrice);
    } else {
      setSalePrice(0); // Reset sale price if no battery is selected
    }
  }, [selectedBattery]);
  
  const scrapBatteryValue = useMemo(() => scrapWeight * scrapRate, [scrapWeight, scrapRate]);
  const finalAmount = useMemo(() => {
      const baseAmount = salePrice - scrapBatteryValue;
      return addChargingService ? baseAmount + chargingServiceAmount : baseAmount;
  }, [salePrice, scrapBatteryValue, addChargingService, chargingServiceAmount]);

  const warrantyEndDate = useMemo(() => {
    if (selectedBattery && selectedBattery.warrantyMonths > 0) {
      return addMonths(saleDate, selectedBattery.warrantyMonths);
    }
    return null;
  }, [selectedBattery, saleDate]);


  const handleSave = async () => {
    if ((customerType === 'registered' && !selectedCustomer) || (customerType === 'walk-in' && !walkInCustomerName)) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a customer or enter a name for a walk-in customer.',
      });
      return;
    }
     if (!selectedBattery && !addChargingService) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'You must either sell a battery or add a charging service.',
      });
      return;
    }
    setShowConfirmation(true);
  };
  
  const confirmSave = async () => {
    setShowConfirmation(false);
    setIsSaving(true);
    if (!firestore) return;

    const batch = writeBatch(firestore);

    let customerIdToSave = selectedCustomer?.id;
    // Handle customer creation/selection
    if (customerType === 'walk-in') {
      const walkInCustomer: Omit<Customer, 'id'> = {
        name: walkInCustomerName,
        phone: '',
        vehicleDetails: 'N/A',
        balance: 0,
        type: 'walk-in',
      };
      if (status !== 'Paid') {
          const newCustomerRef = doc(collection(firestore, 'customers'));
          batch.set(newCustomerRef, { ...walkInCustomer, type: 'registered', balance: finalAmount });
          customerIdToSave = newCustomerRef.id;
      } else {
          customerIdToSave = 'walk-in-customer'; 
      }
    }


    if (!customerIdToSave) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not determine customer to save.' });
        setIsSaving(false);
        return;
    }
    
    // 1. Create/Update Battery Sale document
    const saleRef = editId ? doc(firestore, 'battery_sales', editId) : doc(collection(firestore, 'battery_sales'));
    const saleData: Partial<BatterySale> = {
      customerId: customerIdToSave,
      customerName: customerType === 'walk-in' ? walkInCustomerName : selectedCustomer?.name || 'N/A',
      batteryId: selectedBattery?.id, // Can be undefined
      date: saleDate.toISOString(),
      manufacturingCode,
      salePrice: salePrice || 0,
      scrapBatteryWeight: scrapWeight,
      scrapBatteryRate: scrapRate,
      scrapBatteryValue: scrapBatteryValue,
      finalAmount,
      warrantyEndDate: warrantyEndDate ? warrantyEndDate.toISOString() : '',
      status,
      chargingServiceAmount: addChargingService ? chargingServiceAmount : 0,
    };
    batch.set(saleRef, saleData, { merge: true });

    // 2. Update battery stock (only on new sales and if a battery was sold)
    if(!editId && selectedBattery) {
      const batteryRef = doc(firestore, 'batteries', selectedBattery.id);
      batch.update(batteryRef, { stock: selectedBattery.stock - 1 });
    }

    // 3. Update scrap stock (only on new sales with scrap)
    if(!editId && scrapWeight > 0) {
      const scrapStockRef = doc(firestore, 'scrap_stock', 'main');
      const scrapSnap = await getDoc(scrapStockRef);
      const currentScrapWeight = scrapSnap.exists() ? scrapSnap.data().totalWeightKg : 0;
      const currentScrapValue = scrapSnap.exists() ? scrapSnap.data().totalScrapValue : 0;
      batch.set(scrapStockRef, { 
        totalWeightKg: currentScrapWeight + scrapWeight,
        totalScrapValue: currentScrapValue + scrapBatteryValue,
      }, { merge: true });
    }

    // 4. Update customer balance if registered and unpaid (handle with care for edits)
    if (customerType === 'registered' && selectedCustomer && status !== 'Paid') {
      if(!editId) {
        const customerRef = doc(firestore, 'customers', selectedCustomer.id);
        batch.update(customerRef, { balance: (selectedCustomer.balance || 0) + finalAmount });
      }
    }
    
    try {
      await batch.commit();
      toast({
        title: 'Sale Successful',
        description: `The battery transaction has been ${editId ? 'updated' : 'recorded'}.`,
      });
      router.push('/sales?tab=battery');
    } catch (error) {
      console.error('Error saving battery sale: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'There was a problem saving the transaction.',
      });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>{editId ? 'Edit' : 'New'} Battery Transaction</CardTitle>
          <CardDescription>Create a new sale for batteries, including scrap trade-in and services.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {/* Customer & Date */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label>Customer Type</Label>
                    <Select value={customerType} onValueChange={(v: 'walk-in' | 'registered') => { setCustomerType(v); setSelectedCustomer(null); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                            <SelectItem value="registered">Registered Customer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>{customerType === 'walk-in' ? 'Customer Name' : 'Select Customer'}</Label>
                    {customerType === 'walk-in' ? (
                        <Input placeholder="Enter customer name" value={walkInCustomerName} onChange={e => setWalkInCustomerName(e.target.value)} />
                    ) : (
                    <div className="flex gap-2">
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
                         <Button variant="outline" size="icon" onClick={() => setIsCustomerDialogOpen(true)}>
                            <UserPlus className="h-4 w-4" />
                        </Button>
                    </div>
                    )}
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
                <Label>Select Battery (Optional)</Label>
                 <Select 
                    onValueChange={(id) => {
                        if (id === '__none__') {
                            setSelectedBattery(null);
                        } else {
                            setSelectedBattery(batteries?.find(b => b.id === id) || null)
                        }
                    }} 
                    value={selectedBattery?.id || '__none__'}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Choose a battery from stock..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__none__">No Battery (Service Only)</SelectItem>
                        {batteries?.filter(b => b.stock > 0 || b.id === selectedBattery?.id).map(battery => (
                            <SelectItem key={battery.id} value={battery.id}>
                                {battery.brand} {battery.model} ({battery.ampere}Ah) - Stock: {battery.stock}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
             {/* Additional Services */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg text-primary">Additional Services</h3>
                <div className="flex items-center space-x-2">
                    <Checkbox id="charging-service" checked={addChargingService} onCheckedChange={(checked) => setAddChargingService(checked as boolean)} />
                    <Label htmlFor="charging-service" className="cursor-pointer">Add Battery Charging Service</Label>
                </div>
                {addChargingService && (
                    <div className="grid md:grid-cols-3 gap-6 pl-6">
                        <div className="space-y-2">
                            <Label htmlFor="charging-amount">Charging Amount (Rs.)</Label>
                            <Input id="charging-amount" type="number" value={chargingServiceAmount} onChange={(e) => setChargingServiceAmount(Number(e.target.value))} />
                        </div>
                    </div>
                )}
            </div>

            {/* Transaction Details */}
            {(selectedBattery || scrapWeight > 0) && (
                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                    {/* New Battery Details */}
                    {selectedBattery && (
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
                    )}
                    {/* Scrap Battery Details */}
                    <div className="space-y-6">
                        <h3 className="font-semibold text-lg text-destructive">Scrap Battery Trade-in (Optional)</h3>
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
                    {selectedBattery && <div className="flex justify-between w-full max-w-xs text-muted-foreground"><span>Sale Price:</span><span className="font-mono">Rs. {salePrice.toLocaleString()}</span></div>}
                    {scrapWeight > 0 && <div className="flex justify-between w-full max-w-xs text-muted-foreground"><span>Scrap Deduction:</span><span className="font-mono">- Rs. {scrapBatteryValue.toLocaleString()}</span></div>}
                    {addChargingService && <div className="flex justify-between w-full max-w-xs text-muted-foreground"><span>Charging Service:</span><span className="font-mono">+ Rs. {chargingServiceAmount.toLocaleString()}</span></div>}
                    <div className="flex justify-between w-full max-w-xs text-xl font-bold border-t pt-2 mt-2"><span>Final Amount:</span><span className="font-mono">Rs. {finalAmount.toLocaleString()}</span></div>
                </div>
            </div>

        </CardContent>
        <CardFooter className="flex justify-end">
          <Button size="lg" onClick={handleSave} disabled={isSaving || (!selectedBattery && !addChargingService) || (customerType === 'registered' && !selectedCustomer) || (customerType === 'walk-in' && !walkInCustomerName)}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : (editId ? 'Update Transaction' : 'Save Transaction')}
          </Button>
        </CardFooter>
      </Card>
      
       <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirm Transaction</AlertDialogTitle>
                <AlertDialogDescription>
                    Please review the details before saving. This action will update stock and cannot be easily undone.
                     <div className="my-4 space-y-1 text-sm text-foreground">
                        <p><strong>Customer:</strong> {customerType === 'walk-in' ? walkInCustomerName : selectedCustomer?.name}</p>
                        {selectedBattery && <p><strong>Battery:</strong> {selectedBattery?.brand} {selectedBattery?.model}</p>}
                        {addChargingService && <p><strong>Charging Service:</strong> Rs. {chargingServiceAmount.toLocaleString()}</p>}
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

        <CustomerDialog
            isOpen={isCustomerDialogOpen}
            onClose={() => setIsCustomerDialogOpen(false)}
            onSave={() => {}}
            customer={null}
        />

    </div>
  );
}
