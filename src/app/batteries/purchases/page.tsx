'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import type { Battery, Dealer, BatteryPurchase, BankAccount } from "@/lib/data";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PurchaseItem {
    id: string; // This is the battery ID from the 'batteries' collection
    name: string;
    quantity: number;
    costPrice: number;
    currentStock: number;
}

export default function BatteryPurchaseForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const { toast } = useToast();

    const editId = searchParams.get('edit');
    const isNew = !editId;

    const batteriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'batteries') : null, [firestore]);
    const dealersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'dealers') : null, [firestore]);
    const bankAccountsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'my_bank_accounts') : null, [firestore]);


    const { data: batteries, isLoading: batteriesLoading } = useCollection<Battery>(batteriesCollection);
    const { data: dealers, isLoading: dealersLoading } = useCollection<Dealer>(dealersCollection);
    const { data: bankAccounts, isLoading: bankAccountsLoading } = useCollection<BankAccount>(bankAccountsCollection);

    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
    const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(new Date());
    const [isSaving, setIsSaving] = useState(false);
    
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online'>('Cash');
    const [paymentSourceAccount, setPaymentSourceAccount] = useState('');
    const [paymentDestinationDetails, setPaymentDestinationDetails] = useState({
      accountTitle: '',
      bankName: '',
      accountNumber: ''
    });

    const batteryDealers = useMemo(() => dealers?.filter(d => d.type === 'battery') || [], [dealers]);

    useEffect(() => {
        if (editId && firestore && !dealersLoading && !batteriesLoading && batteries && batteryDealers) {
            const fetchPurchase = async () => {
                const purchaseRef = doc(firestore, 'battery_purchases', editId);
                const purchaseSnap = await getDoc(purchaseRef);
                if (purchaseSnap.exists()) {
                    const purchaseData = purchaseSnap.data() as BatteryPurchase;
                    if(purchaseData.dealerId) {
                        const dealer = batteryDealers.find(d => d.id === purchaseData.dealerId);
                        setSelectedDealer(dealer || null);
                    }
                    setPurchaseDate(new Date(purchaseData.date));
                    const purchaseItems: PurchaseItem[] = purchaseData.items.map(item => {
                        const battery = batteries.find(b => b.id === item.batteryId);
                        return {
                            id: item.batteryId,
                            name: `${battery?.brand} ${battery?.model}` || 'Unknown Battery',
                            quantity: item.quantity,
                            costPrice: item.costPrice,
                            currentStock: battery?.stock || 0
                        };
                    });
                    setItems(purchaseItems);
                    
                    // Populate payment details
                    if(purchaseData.paymentMethod) setPaymentMethod(purchaseData.paymentMethod);
                    if(purchaseData.paymentSourceAccount) setPaymentSourceAccount(purchaseData.paymentSourceAccount);
                    if (purchaseData.paymentDestinationDetails) {
                        setPaymentDestinationDetails({
                          ...purchaseData.paymentDestinationDetails,
                          accountNumber: purchaseData.paymentDestinationDetails.accountNumber || '',
                        });
                    }
                }
            };
            fetchPurchase();
        }
    }, [editId, firestore, batteries, batteryDealers, batteriesLoading, dealersLoading]);
    
    const handleBatterySelect = (batteryId: string) => {
        const battery = batteries?.find(b => b.id === batteryId);
        if (!battery || items.some(item => item.id === battery.id)) return;

        setItems(prev => [...prev, {
            id: battery.id,
            name: `${battery.brand} ${battery.model}`,
            quantity: 1,
            costPrice: battery.costPrice,
            currentStock: battery.stock
        }]);
    };

    const updateItem = (id: string, field: 'quantity' | 'costPrice', value: number) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const totalAmount = useMemo(() => items.reduce((acc, item) => acc + item.quantity * item.costPrice, 0), [items]);

    const selectedBankAccount = useMemo(() => {
        if (!paymentSourceAccount || !bankAccounts) return null;
        return bankAccounts.find(acc => acc.id === paymentSourceAccount);
    }, [paymentSourceAccount, bankAccounts]);

    const hasSufficientFunds = useMemo(() => {
        if (paymentMethod !== 'Online' || !selectedBankAccount) return true;
        return selectedBankAccount.balance >= totalAmount;
    }, [paymentMethod, selectedBankAccount, totalAmount]);

    const handleSavePurchase = async () => {
        if (!firestore || !selectedDealer || items.length === 0 || !purchaseDate) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a dealer and add at least one item.' });
            return;
        }
        if (!hasSufficientFunds) {
            toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'Not enough balance in the selected bank account for this payment.' });
            return;
        }
        setIsSaving(true);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                // --- 1. All READ operations first ---
                const batteryRefs = items.map(item => doc(firestore, 'batteries', item.id));
                const batterySnaps = await Promise.all(batteryRefs.map(ref => transaction.get(ref)));
                const bankDoc = (paymentMethod === 'Online' && paymentSourceAccount) ? await transaction.get(doc(firestore, 'my_bank_accounts', paymentSourceAccount)) : null;

                if (paymentMethod === 'Online' && bankDoc && bankDoc.exists() && bankDoc.data().balance < totalAmount) {
                    throw new Error("Insufficient balance in the selected account.");
                }

                // --- 2. All WRITE operations second ---
                batterySnaps.forEach((batterySnap, index) => {
                    const item = items[index];
                    const currentStock = batterySnap.exists() ? (batterySnap.data() as Battery).stock : 0;
                    // Simplified logic for stock update. For edits, a more complex diff would be needed.
                    // This assumes adding stock on new purchase, and recalculating for edits.
                    const newStock = isNew ? currentStock + item.quantity : item.currentStock + item.quantity;
                    transaction.update(batterySnap.ref, { stock: newStock });
                });

                if (paymentMethod === 'Online' && bankDoc?.exists()) {
                    const newBankBalance = bankDoc.data().balance - totalAmount;
                    transaction.update(bankDoc.ref, { balance: newBankBalance });
                }

                const purchaseData: Omit<BatteryPurchase, 'id'> = {
                    dealerId: selectedDealer.id,
                    date: purchaseDate.toISOString(),
                    items: items.map(i => ({ batteryId: i.id, quantity: i.quantity, costPrice: i.costPrice })),
                    totalAmount: totalAmount,
                    paymentMethod: paymentMethod,
                    ...(paymentMethod === 'Online' && { paymentSourceAccount, paymentDestinationDetails }),
                };

                const purchaseRef = isNew ? doc(collection(firestore, 'battery_purchases')) : doc(firestore, 'battery_purchases', editId!);
                transaction.set(purchaseRef, purchaseData);
            });

            toast({ title: 'Purchase Saved', description: 'Battery stock has been updated successfully.' });
            router.push('/purchase?tab=battery');

        } catch (error) {
            console.error("Error saving battery purchase:", error);
            toast({ variant: "destructive", title: "Error", description: (error as Error).message || "Failed to save the purchase." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{isNew ? 'New' : 'Edit'} Battery Purchase</CardTitle>
                <CardDescription>Record a new purchase of batteries from a dealer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Dealer</Label>
                        <Select onValueChange={(dealerId) => setSelectedDealer(batteryDealers?.find(d => d.id === dealerId) || null)} value={selectedDealer?.id}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a dealer" />
                            </SelectTrigger>
                            <SelectContent>
                                {dealersLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : batteryDealers?.map(dealer => (
                                    <SelectItem key={dealer.id} value={dealer.id}>{dealer.company}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Purchase Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !purchaseDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {purchaseDate ? format(purchaseDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={purchaseDate} onSelect={setPurchaseDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Add Batteries</Label>
                    <Select onValueChange={handleBatterySelect}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a battery to add to the purchase list..." />
                        </SelectTrigger>
                        <SelectContent>
                            {batteriesLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : batteries?.map(battery => (
                                <SelectItem key={battery.id} value={battery.id} disabled={items.some(i => i.id === battery.id)}>
                                    {battery.brand} {battery.model} ({battery.ampere}Ah) - Stock: {battery.stock}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/2">Battery</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Cost Price (per unit)</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No batteries added to this purchase.
                                    </TableCell>
                                </TableRow>
                            ) : items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>
                                        <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} className="w-24" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={item.costPrice} onChange={e => updateItem(item.id, 'costPrice', parseInt(e.target.value) || 0)} className="w-28" />
                                    </TableCell>
                                    <TableCell className="text-right font-mono">Rs. {(item.quantity * item.costPrice).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>Payment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'Cash' | 'Online')} className="flex gap-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Cash" id="cash" /><Label htmlFor="cash">Cash</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Online" id="online" /><Label htmlFor="online">Online</Label></div>
                            </RadioGroup>
                        </div>

                        {paymentMethod === 'Online' && (
                            <div className="grid md:grid-cols-2 gap-6 p-4 border rounded-md">
                                <div className="space-y-2">
                                    <Label htmlFor="paymentSource">My Account (Source)</Label>
                                    <Select value={paymentSourceAccount} onValueChange={setPaymentSourceAccount}>
                                        <SelectTrigger id="paymentSource"><SelectValue placeholder="Select my bank" /></SelectTrigger>
                                        <SelectContent>
                                             {bankAccountsLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                                bankAccounts?.map(account => (
                                                <SelectItem key={account.id} value={account.id}>
                                                    {account.bankName} (Balance: {account.balance.toLocaleString()})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!hasSufficientFunds && (
                                        <p className="text-xs text-destructive">Insufficient balance in the selected account.</p>
                                    )}
                                </div>
                                <div className="space-y-4">
                                  <h4 className="text-sm font-medium text-muted-foreground">Dealer's Account (Destination)</h4>
                                  <div className="space-y-2">
                                      <Label htmlFor="dest-title" className="text-xs">Account Title</Label>
                                      <Input id="dest-title" value={paymentDestinationDetails.accountTitle} onChange={e => setPaymentDestinationDetails(p => ({...p, accountTitle: e.target.value}))} placeholder="e.g. John Doe"/>
                                  </div>
                                   <div className="space-y-2">
                                      <Label htmlFor="dest-bank" className="text-xs">Bank Name</Label>
                                      <Input id="dest-bank" value={paymentDestinationDetails.bankName} onChange={e => setPaymentDestinationDetails(p => ({...p, bankName: e.target.value}))} placeholder="e.g. HBL"/>
                                  </div>
                                   <div className="space-y-2">
                                      <Label htmlFor="dest-acc" className="text-xs">Account Number (Optional)</Label>
                                      <Input id="dest-acc" value={paymentDestinationDetails.accountNumber} onChange={e => setPaymentDestinationDetails(p => ({...p, accountNumber: e.target.value}))} placeholder="e.g. PK..."/>
                                  </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-end text-xl font-bold">
                    <div className="flex items-center gap-4">
                        <Label>Grand Total:</Label>
                        <p>Rs. {totalAmount.toLocaleString()}</p>
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.push('/purchase?tab=battery')}>Cancel</Button>
                <Button onClick={handleSavePurchase} disabled={isSaving || !hasSufficientFunds}>
                    {isSaving ? 'Saving...' : 'Save Purchase'}
                </Button>
            </CardFooter>
        </Card>
    );
}

    
