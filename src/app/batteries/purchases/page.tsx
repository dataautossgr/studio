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
import type { Battery, Dealer, BatteryPurchase } from "@/lib/data";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

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

    const { data: batteries, isLoading: batteriesLoading } = useCollection<Battery>(batteriesCollection);
    const { data: dealers, isLoading: dealersLoading } = useCollection<Dealer>(dealersCollection);

    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
    const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(new Date());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (editId && firestore && !dealersLoading && !batteriesLoading && batteries && dealers) {
            const fetchPurchase = async () => {
                const purchaseRef = doc(firestore, 'battery_purchases', editId);
                const purchaseSnap = await getDoc(purchaseRef);
                if (purchaseSnap.exists()) {
                    const purchaseData = purchaseSnap.data() as BatteryPurchase;
                    if(purchaseData.dealerId) {
                        const dealer = dealers.find(d => d.id === purchaseData.dealerId);
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
                }
            };
            fetchPurchase();
        }
    }, [editId, firestore, batteries, dealers, batteriesLoading, dealersLoading]);
    
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

    const handleSavePurchase = async () => {
        if (!firestore || !selectedDealer || items.length === 0 || !purchaseDate) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a dealer and add at least one item.' });
            return;
        }
        setIsSaving(true);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                // Update stock for each item
                for (const item of items) {
                    const batteryRef = doc(firestore, 'batteries', item.id);
                    // This logic is simplified. A real-world scenario would need to handle stock reversal on edit.
                    const batterySnap = await transaction.get(batteryRef);
                    const currentStock = batterySnap.exists() ? (batterySnap.data() as Battery).stock : 0;
                    const newStock = isNew ? currentStock + item.quantity : item.currentStock + item.quantity;
                    transaction.update(batteryRef, { stock: newStock });
                }

                // Create or update purchase record
                const purchaseData: Omit<BatteryPurchase, 'id'> = {
                    dealerId: selectedDealer.id,
                    date: purchaseDate.toISOString(),
                    items: items.map(i => ({ batteryId: i.id, quantity: i.quantity, costPrice: i.costPrice })),
                    totalAmount: totalAmount
                };

                if (isNew) {
                    const newPurchaseRef = doc(collection(firestore, 'battery_purchases'));
                    transaction.set(newPurchaseRef, purchaseData);
                } else {
                    const purchaseRef = doc(firestore, 'battery_purchases', editId);
                    // Note: This simplified logic overwrites the old purchase.
                    // A robust solution would calculate stock differences for edited items.
                    transaction.set(purchaseRef, purchaseData);
                }
            });

            toast({ title: 'Purchase Saved', description: 'Battery stock has been updated successfully.' });
            router.push('/purchase?tab=battery');

        } catch (error) {
            console.error("Error saving battery purchase:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save the purchase." });
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
                        <Select onValueChange={(dealerId) => setSelectedDealer(dealers?.find(d => d.id === dealerId) || null)} value={selectedDealer?.id}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a dealer" />
                            </SelectTrigger>
                            <SelectContent>
                                {dealersLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : dealers?.map(dealer => (
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

                <div className="flex justify-end text-xl font-bold">
                    <div className="flex items-center gap-4">
                        <Label>Grand Total:</Label>
                        <p>Rs. {totalAmount.toLocaleString()}</p>
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.push('/purchase?tab=battery')}>Cancel</Button>
                <Button onClick={handleSavePurchase} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Purchase'}
                </Button>
            </CardFooter>
        </Card>
    );
}
