'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, getDoc, getCountFromServer, DocumentReference, setDoc } from 'firebase/firestore';
import type { Customer, Battery, BatterySale, AcidStock } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Save, Search, UserPlus, Trash2, PlusCircle, Car } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  costPrice: number;
  stock: number;
  isOneTime: boolean;
  type: 'battery' | 'service' | 'scrap' | 'acid' | 'one-time';
  warrantyMonths?: number;
  manufacturingCode?: string;
}

const onlinePaymentProviders = ["Easypaisa", "Jazzcash", "Meezan Bank", "Nayapay", "Sadapay", "Upaisa", "Islamic Bank"];

export default function BatterySaleForm() {
  const [sale, setSale] = useState<BatterySale | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [customerType, setCustomerType] = useState<'walk-in' | 'registered'>('walk-in');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | null>('cash');
  const [onlinePaymentSource, setOnlinePaymentSource] = useState('');
  const [partialAmount, setPartialAmount] = useState(0);
  const [saleDate, setSaleDate] = useState<Date | undefined>(new Date());
  const [saleTime, setSaleTime] = useState(format(new Date(), 'HH:mm'));
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [cashReceived, setCashReceived] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isWalkInUnpaidDialogOpen, setIsWalkInUnpaidDialogOpen] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();

  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const batteriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'batteries') : null, [firestore]);
  const acidStockRef = useMemoFirebase(() => firestore ? doc(firestore, 'acid_stock', 'main') : null, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: batteries, isLoading: batteriesLoading } = useCollection<Battery>(batteriesCollection);
  
  const editId = searchParams.get('edit');
  const isNew = !editId;

  // Form Population for Editing
  useEffect(() => {
    if (editId && firestore && !customersLoading && !batteriesLoading) {
        const fetchSaleData = async () => {
            const saleRef = doc(firestore, 'battery_sales', editId);
            const saleSnap = await getDoc(saleRef);
            if(saleSnap.exists()) {
                const saleData = {id: saleSnap.id, ...saleSnap.data()} as BatterySale;
                setSale(saleData);

                if (saleData.customer instanceof DocumentReference) {
                    const customerSnap = await getDoc(saleData.customer);
                    if (customerSnap.exists()) {
                        const customerData = { id: customerSnap.id, ...customerSnap.data() } as Customer;
                         setCustomerType(customerData.type);
                        if (customerData.type === 'registered') {
                            setSelectedCustomer(customerData);
                        } else {
                            setCustomerName(customerData.name);
                        }
                    }
                }
                
                setCart(saleData.items);
                setDiscount(saleData.discount || 0);
                setStatus(saleData.status);
                
                if (saleData.status === 'Paid') {
                    setPaymentMethod(saleData.paymentMethod || 'cash');
                    setOnlinePaymentSource(saleData.onlinePaymentSource || '');
                } else {
                    setPaymentMethod(null);
                }
                if (saleData.status === 'Partial') {
                    setPartialAmount(saleData.partialAmountPaid || 0);
                }
            
                const transactionDate = new Date(saleData.date);
                setSaleDate(transactionDate);
                setSaleTime(format(transactionDate, 'HH:mm'));
                if(saleData.dueDate) setDueDate(new Date(saleData.dueDate));
            }
        };
        fetchSaleData();
    }
  }, [editId, firestore, batteries, customers, customersLoading, batteriesLoading]);


  const subtotal = useMemo(() => cart.reduce((acc, item) => {
    // Scrap price is negative and should be added to the total (reducing it)
    if (item.type === 'scrap') {
        return acc - (item.quantity * item.price);
    }
    return acc + (item.quantity * item.price);
  }, 0), [cart]);

  const finalAmount = subtotal - discount;
  const changeToReturn = paymentMethod === 'cash' && cashReceived > finalAmount ? cashReceived - finalAmount : 0;
  
  const handleBatterySelect = (battery: Battery) => {
    const existingItem = cart.find(item => item.id === battery.id);
    if(existingItem) return; // Prevent adding same battery twice

    setCart(prev => [...prev, {
        id: battery.id,
        name: `${battery.brand} ${battery.model} (${battery.ampere}Ah)`,
        quantity: 1,
        price: battery.salePrice,
        costPrice: battery.costPrice,
        stock: battery.stock,
        isOneTime: false,
        type: 'battery',
        warrantyMonths: battery.warrantyMonths,
        manufacturingCode: '',
    }]);
  };
  
  const addSpecialItem = (type: 'scrap' | 'acid' | 'service' | 'one-time') => {
    const newId = `${type}-${Date.now()}`;
    let name = 'One-Time Product';
    let price = 0;
    let quantity = 1;

    if (type === 'scrap') name = 'Scrap Battery Trade-in';
    if (type === 'acid') name = 'Acid Sale';
    if (type === 'service') name = 'Battery Charging Service';

    // Scrap price should be entered by user, can be positive and will be subtracted
    if(type === 'scrap') price = 0;

    setCart(prev => [...prev, {
        id: newId, name, quantity, price,
        costPrice: 0, stock: 0, isOneTime: true, type,
    }]);
  };
  
  const updateCartItem = (id: string, field: keyof CartItem, value: any) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveNewCustomer = async (customerData: Omit<Customer, 'id' | 'balance' | 'type'>) => {
    if (!firestore) return;
    const newCustomerWithDefaults = { 
      ...customerData, 
      balance: 0,
      type: 'registered' as const
    };
    
    const newCustomerRef = doc(collection(firestore, 'customers'));
    await setDoc(newCustomerRef, newCustomerWithDefaults);
    
    const newCustomer = { ...newCustomerWithDefaults, id: newCustomerRef.id };
    setSelectedCustomer(newCustomer);
    toast({ title: "Success", description: "New customer has been registered." });
    setIsCustomerDialogOpen(false);
  };

  const preSaveValidation = (print: boolean) => {
    if (!saleDate || cart.length === 0 || (customerType === 'registered' && !selectedCustomer) || (customerType === 'walk-in' && !customerName)) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please fill all required fields and add items to the cart." });
        return;
    }
    if (customerType === 'walk-in' && (status === 'Unpaid' || status === 'Partial')) {
        setIsWalkInUnpaidDialogOpen(true);
    } else {
        setIsPrintDialogOpen(print);
    }
  };


  const handleSaveSale = async (print = false) => {
    if (!firestore || !saleDate) return;
    setIsSaving(true);
    setIsPrintDialogOpen(false);
    setIsWalkInUnpaidDialogOpen(false);

    const finalSaleDate = new Date(saleDate);
    const [hours, minutes] = saleTime.split(':').map(Number);
    finalSaleDate.setHours(hours, minutes);

    const dueAmount = finalAmount - (status === 'Partial' ? partialAmount : 0);

    const batch = writeBatch(firestore);
    let customerRef;

    // Handle Customer
    if (customerType === 'registered' && selectedCustomer) {
        customerRef = doc(firestore, 'customers', selectedCustomer.id);
        if (status !== 'Paid') {
            const previousDue = isNew ? 0 : (sale?.total || 0) - (sale?.partialAmountPaid || 0);
            const balanceChange = dueAmount - previousDue;
            batch.update(customerRef, { balance: (selectedCustomer.balance || 0) + balanceChange });
        }
    } else { // Walk-in or converting to registered
        const isConverting = customerType === 'walk-in' && (status === 'Unpaid' || status === 'Partial');
        customerRef = doc(collection(firestore, 'customers'));
        const customerPayload: Omit<Customer, 'id'> = {
            name: customerName, phone: '', vehicleDetails: '',
            type: isConverting ? 'registered' : 'walk-in',
            balance: isConverting ? dueAmount : 0,
        };
        batch.set(customerRef, customerPayload);
    }

    // Prepare Sale Data
    const saleData: Omit<BatterySale, 'id'> = {
        invoice: '',
        customer: customerRef,
        date: finalSaleDate.toISOString(),
        total: finalAmount,
        status,
        items: cart,
        discount,
        ...(status === 'Paid' && { paymentMethod: paymentMethod || 'cash' }),
        ...(paymentMethod === 'online' && { onlinePaymentSource }),
        ...(status === 'Partial' && { partialAmountPaid: partialAmount }),
        ...(status !== 'Paid' && dueDate && { dueDate: dueDate.toISOString() }),
    };

    // Update Stock
    for (const item of cart) {
        if (item.type === 'battery' && !item.isOneTime) {
            batch.update(doc(firestore, 'batteries', item.id), { stock: item.stock - item.quantity });
        }
        if (item.type === 'acid' && acidStockRef) {
            const acidStockSnap = await getDoc(acidStockRef);
            const currentAcidQty = acidStockSnap.exists() ? acidStockSnap.data().totalQuantityKg : 0;
            batch.update(acidStockRef, { totalQuantityKg: currentAcidQty - item.quantity });
        }
        if (item.type === 'scrap') {
             const scrapStockRef = doc(firestore, 'scrap_stock', 'main');
             const scrapSnap = await getDoc(scrapStockRef);
             const currentScrapWeight = scrapSnap.exists() ? scrapSnap.data().totalWeightKg : 0;
             batch.set(scrapStockRef, { totalWeightKg: currentScrapWeight + item.quantity }, { merge: true });
        }
    }

    // Set/Update Sale Document
    if (isNew) {
        const salesSnapshot = await getCountFromServer(collection(firestore, 'battery_sales'));
        saleData.invoice = `B-INV-${new Date().getFullYear()}-${(salesSnapshot.data().count + 1).toString().padStart(4, '0')}`;
        const newSaleRef = doc(collection(firestore, 'battery_sales'));
        batch.set(newSaleRef, saleData);
    } else {
        batch.update(doc(firestore, 'battery_sales', editId), saleData as any);
    }

    // Commit
    try {
        await batch.commit();
        toast({ title: "Sale Saved", description: "The transaction has been successfully recorded." });
        if (print) {
            const saleIdToPrint = isNew ? 'new-id' : editId; // This part is tricky without getting the new ID back
            // router.push(`/batteries/sales/invoice/${saleIdToPrint}`);
             router.push(`/sales?tab=battery`);
        } else {
            router.push('/sales?tab=battery');
        }
    } catch (error) {
        console.error("Error saving sale:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to save the sale." });
    } finally {
        setIsSaving(false);
    }
  };


  return (
    <div>
        <Card>
            <CardHeader>
            <CardTitle>{isNew ? 'New' : 'Edit'} Battery Transaction</CardTitle>
            <CardDescription>Create a new sale for batteries and related services.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Customer Section */}
                <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                <Label>Customer Type</Label>
                <Select value={customerType} onValueChange={(val: 'walk-in' | 'registered') => { setCustomerType(val); setSelectedCustomer(null); setCustomerName(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                    <SelectItem value="registered">Registered Customer</SelectItem>
                    </SelectContent>
                </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="customerName">{customerType === 'walk-in' ? 'Customer Name' : 'Customer'}</Label>
                    {customerType === 'walk-in' ? ( <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g., John Doe" />) 
                    : (
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
                                                    <CommandItem key={customer.id} onSelect={() => { setSelectedCustomer(customer); (document.activeElement as HTMLElement)?.blur();}}>
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
                <div className='grid grid-cols-2 gap-2'>
                <div className="space-y-2">
                    <Label>Sale Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!saleDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />{saleDate ? format(saleDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={saleDate} onSelect={setSaleDate} initialFocus/></PopoverContent>
                        </Popover>
                </div>
                <div className="space-y-2"><Label>Sale Time</Label><Input type="time" value={saleTime} onChange={e => setSaleTime(e.target.value)} /></div>
                </div>
            </div>
                {/* Product Section */}
                <div className="space-y-2">
                    <Label>Add Items to Bill</Label>
                    <div className="flex flex-wrap gap-2">
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline" className="flex-1 min-w-[200px] justify-start font-normal text-muted-foreground"><Search className="mr-2 h-4 w-4" /> Add Battery from Stock...</Button></PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search battery by brand or model..."/>
                                    <CommandList>
                                        <CommandEmpty>No batteries found.</CommandEmpty>
                                        <CommandGroup>
                                            {batteries?.map(battery => (
                                                <CommandItem key={battery.id} onSelect={() => {handleBatterySelect(battery); (document.activeElement as HTMLElement)?.blur();}}>
                                                    {battery.brand} {battery.model} ({battery.ampere}Ah) - Stock: {battery.stock}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Button variant="secondary" onClick={() => addSpecialItem('service')}>Charging Service</Button>
                        <Button variant="secondary" onClick={() => addSpecialItem('acid')}>Sell Acid</Button>
                        <Button variant="destructive" onClick={() => addSpecialItem('scrap')}>Scrap Trade-in</Button>
                        <Button variant="secondary" onClick={() => addSpecialItem('one-time')}>One-Time Product</Button>
                    </div>
                </div>
                {/* Cart Table */}
                <div className="border rounded-md"><Table><TableHeader><TableRow>
                    <TableHead className="w-2/5">Product / Service</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow></TableHeader><TableBody>
                    {cart.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Your bill is empty.</TableCell></TableRow>
                    : cart.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>
                                {item.type === 'one-time' ? <Input value={item.name} onChange={e => updateCartItem(item.id, 'name', e.target.value)} /> : <span className="font-medium">{item.name}</span>}
                            </TableCell>
                            <TableCell>
                                {item.type === 'battery' && <Input value={item.manufacturingCode || ''} onChange={e => updateCartItem(item.id, 'manufacturingCode', e.target.value)} placeholder="Mfc. Code" className="text-xs"/>}
                            </TableCell>
                            <TableCell>
                                <Input type="number" value={item.quantity} onChange={e => updateCartItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-20"/>
                            </TableCell>
                            <TableCell>
                                <Input type="number" value={item.price} onChange={e => updateCartItem(item.id, 'price', parseFloat(e.target.value) || 0)} className="w-24"/>
                            </TableCell>
                            <TableCell className="text-right font-mono">Rs. {(item.quantity * item.price).toLocaleString()}</TableCell>
                            <TableCell><Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                    ))}
                </TableBody></Table></div>
                {/* Calculation Section */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Label htmlFor="status" className="flex-shrink-0">Sale Status</Label>
                            <Select value={status} onValueChange={(val: 'Paid' | 'Unpaid' | 'Partial') => { setStatus(val); if (val !== 'Paid') { setPaymentMethod(null); } else { setPaymentMethod(paymentMethod || 'cash'); } }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Unpaid">Unpaid</SelectItem><SelectItem value="Partial">Partial</SelectItem></SelectContent>
                            </Select>
                        </div>
                        {(status === 'Unpaid' || status === 'Partial') && ( <div className="space-y-2">
                            <Label>Payment Due Date (Optional)</Label>
                            <Popover><PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />{dueDate ? format(dueDate, "PPP") : <span>Set a due date</span>}
                                </Button>
                            </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus/></PopoverContent></Popover>
                        </div>)}
                        {status === 'Partial' && (<div className="grid grid-cols-[120px_1fr] items-center gap-4 rounded-md border p-4"><Label htmlFor="partialAmount">Amount Paid</Label><Input id="partialAmount" type="number" value={partialAmount} onChange={(e) => setPartialAmount(parseFloat(e.target.value) || 0)} className="w-full" min="0" max={finalAmount}/></div>)}
                        {status === 'Paid' && (<div className="space-y-4 rounded-md border p-4">
                            <Label>Payment Method</Label>
                            <RadioGroup value={paymentMethod || ''} onValueChange={(val: 'cash' | 'online') => setPaymentMethod(val)} className="flex gap-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="cash" /><Label htmlFor="cash">Cash</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="online" id="online" /><Label htmlFor="online">Online</Label></div>
                            </RadioGroup>
                            {paymentMethod === 'online' && (<div className="grid gap-2"><Label htmlFor="online-source">Bank/Service</Label><Select value={onlinePaymentSource} onValueChange={setOnlinePaymentSource}><SelectTrigger id="online-source"><SelectValue placeholder="Select a payment source" /></SelectTrigger><SelectContent>{onlinePaymentProviders.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>)}
                            {paymentMethod === 'cash' && (<div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="cashReceived">Cash Received</Label><Input id="cashReceived" type="number" value={cashReceived} onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}/></div><div className="space-y-2"><Label>Change</Label><p className="font-bold text-lg h-10 flex items-center">Rs. {changeToReturn.toLocaleString()}</p></div></div>)}
                        </div>)}
                    </div>
                    <div className="space-y-2 text-right">
                        <div className="flex justify-end items-center gap-4"><Label>Subtotal</Label><p className="font-semibold w-32">Rs. {subtotal.toLocaleString()}</p></div>
                        <div className="flex justify-end items-center gap-4"><Label htmlFor="discount">Discount</Label><Input id="discount" type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="w-32"/></div>
                        <div className="flex justify-end items-center gap-4 text-lg font-bold"><Label>Final Amount</Label><p className="w-32">Rs. {finalAmount.toLocaleString()}</p></div>
                        {status === 'Partial' && finalAmount > partialAmount && (<div className="flex justify-end items-center gap-4 text-destructive"><Label>Remaining Balance</Label><p className="font-semibold w-32">Rs. {(finalAmount - partialAmount).toLocaleString()}</p></div>)}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/sales?tab=battery')}>Cancel</Button>
            <Button onClick={() => preSaveValidation(false)} disabled={isSaving}>Save Only</Button>
            <Button onClick={() => preSaveValidation(true)} disabled={isSaving}>Save & Print</Button>
            </CardFooter>
        </Card>
        
        <CustomerDialog isOpen={isCustomerDialogOpen} onClose={() => setIsCustomerDialogOpen(false)} onSave={handleSaveNewCustomer} customer={null}/>

        <AlertDialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm & Save Sale</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogDescription>
                    Please review the details before saving. This action will update stock and cannot be easily undone.
                </AlertDialogDescription>
                <div className="my-4 space-y-1 text-sm text-foreground">
                    <div><strong>Customer:</strong> {customerType === 'walk-in' ? customerName : selectedCustomer?.name}</div>
                    {cart.filter(i => i.type === 'battery').length > 0 && <div><strong>Battery:</strong> {cart.find(i=>i.type==='battery')?.name}</div>}
                    {cart.filter(i => i.type === 'service').length > 0 && <div><strong>Charging Service:</strong> Rs. {cart.find(i=>i.type==='service')?.price.toLocaleString()}</div>}
                    <div><strong>Final Amount:</strong> Rs. {finalAmount.toLocaleString()}</div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => handleSaveSale(true)}>Save & Print</AlertDialogAction>
                    <AlertDialogCancel onClick={() => handleSaveSale(false)}>Save Only</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isWalkInUnpaidDialogOpen} onOpenChange={setIsWalkInUnpaidDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unpaid Sale for Walk-in Customer</AlertDialogTitle>
                    <AlertDialogDescription>
                        This sale is marked as unpaid. Do you want to register '{customerName}' as a new customer to track their balance?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => handleSaveSale(false)}>Yes, Register & Save</AlertDialogAction>
                    <AlertDialogCancel>Cancel Sale</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
