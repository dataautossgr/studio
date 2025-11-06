'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, getDoc, DocumentReference, getCountFromServer } from 'firebase/firestore';
import type { Customer, Battery, BatterySale, BatteryClaim, SaleItem } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const onlinePaymentProviders = ["Easypaisa", "Jazzcash", "Meezan Bank", "Nayapay", "Sadapay", "Upaisa", "Islamic Bank"];

export default function NewClaimPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();

  const saleId = searchParams.get('saleId');

  const [originalSale, setOriginalSale] = useState<BatterySale | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [selectedReplacementBattery, setSelectedReplacementBattery] = useState<Battery | null>(null);
  const [serviceCharges, setServiceCharges] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isPaid, setIsPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [onlinePaymentSource, setOnlinePaymentSource] = useState('');


  const batteriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'batteries') : null, [firestore]);
  const { data: batteries, isLoading: batteriesLoading } = useCollection<Battery>(batteriesCollection);

  useEffect(() => {
    if (!saleId || !firestore) return;

    const fetchSaleData = async () => {
      const saleRef = doc(firestore, 'battery_sales', saleId);
      const saleSnap = await getDoc(saleRef);

      if (saleSnap.exists()) {
        const saleData = { id: saleSnap.id, ...saleSnap.data() } as BatterySale;
        setOriginalSale(saleData);

        if (saleData.customer instanceof DocumentReference) {
          const customerSnap = await getDoc(saleData.customer);
          if (customerSnap.exists()) {
            setCustomer({ id: customerSnap.id, ...customerSnap.data() } as Customer);
          }
        }
      }
    };
    fetchSaleData();
  }, [saleId, firestore]);
  
  const originalBatteryItem = useMemo(() => {
    return originalSale?.items.find(item => item.type === 'battery');
  }, [originalSale]);

  const priceDifference = useMemo(() => {
    if (!originalBatteryItem || !selectedReplacementBattery) return 0;
    return selectedReplacementBattery.salePrice - originalBatteryItem.price;
  }, [originalBatteryItem, selectedReplacementBattery]);

  const totalPayable = useMemo(() => {
      const difference = priceDifference > 0 ? priceDifference : 0;
      return difference + serviceCharges;
  }, [priceDifference, serviceCharges]);

  const handleSaveClaim = async () => {
    if (!firestore || !originalSale || !customer || !selectedReplacementBattery || !originalBatteryItem) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please ensure an original sale is loaded and a replacement battery is selected.',
      });
      return;
    }
    setIsSaving(true);
    
    const batch = writeBatch(firestore);

    // 1. Deduct new battery from stock
    const newBatteryRef = doc(firestore, 'batteries', selectedReplacementBattery.id);
    const newStock = selectedReplacementBattery.stock - 1;
    batch.update(newBatteryRef, { stock: newStock });

    // 2. Create a new BatteryClaim document
    const newClaimRef = doc(collection(firestore, 'battery_claims'));
    const claimData: Omit<BatteryClaim, 'id'> = {
        originalSaleId: originalSale.id,
        customerId: customer.id,
        claimedBatteryId: originalBatteryItem.id,
        replacementBatteryId: selectedReplacementBattery.id,
        claimDate: new Date().toISOString(),
        originalBatteryPrice: originalBatteryItem.price,
        replacementBatteryPrice: selectedReplacementBattery.salePrice,
        priceDifference: priceDifference,
        serviceCharges,
        totalPayable: totalPayable,
        isPaid: totalPayable > 0 ? isPaid : true,
        notes,
    };
    batch.set(newClaimRef, claimData);

    // 3. If there is a payable amount, create a mini-sale for it
    if(totalPayable > 0 && isPaid) {
        const salesSnapshot = await getCountFromServer(collection(firestore, 'battery_sales'));
        const newInvoice = `W-SALE-${new Date().getFullYear()}-${(salesSnapshot.data().count + 1).toString().padStart(4, '0')}`;
        const newSaleRef = doc(collection(firestore, 'battery_sales'));
        
        const saleItem: SaleItem = {
            id: `claim-${newClaimRef.id}`,
            productId: `claim-${newClaimRef.id}`,
            name: `Warranty Claim Charges (Inv: ${originalSale.invoice})`,
            quantity: 1,
            price: totalPayable,
            costPrice: 0, // No cost of goods for claim charges
            stock: 0,
            isOneTime: true,
            type: 'service',
        };

        const newSaleData: Omit<BatterySale, 'id'> = {
            invoice: newInvoice,
            customer: doc(firestore, 'customers', customer.id),
            date: new Date().toISOString(),
            total: totalPayable,
            status: 'Paid',
            items: [saleItem],
            paymentMethod: paymentMethod,
            ...(paymentMethod === 'online' && { onlinePaymentSource }),
        };
        batch.set(newSaleRef, newSaleData);
    }


    try {
      await batch.commit();
      toast({
        title: 'Warranty Claim Successful',
        description: 'The claim has been recorded and stock has been updated.',
      });
      router.push('/sales?tab=battery');
    } catch (error) {
      console.error('Error saving claim:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save the warranty claim.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!saleId) {
    return (
        <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-destructive">Invalid Access</h1>
            <p className="text-muted-foreground">No sale specified for the warranty claim.</p>
            <Button asChild className="mt-4">
                <Link href="/sales?tab=battery">Go Back to Sales</Link>
            </Button>
        </div>
    );
  }

  if (!originalSale) {
    return <div className="p-8 text-center">Loading original sale information...</div>;
  }


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>New Warranty Claim</CardTitle>
          <CardDescription>
            Process a warranty claim for a battery against invoice #{originalSale.invoice}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6 p-4 border rounded-md bg-muted/50">
            <div>
              <Label>Customer</Label>
              <p className="font-semibold">{customer?.name || 'N/A'}</p>
            </div>
            <div>
              <Label>Original Sale Date</Label>
              <p className="font-semibold">{format(new Date(originalSale.date), 'dd MMM, yyyy')}</p>
            </div>
            <div>
                <Label>Original Battery</Label>
                <p className="font-semibold">{originalBatteryItem?.name || 'N/A'} (Sold for Rs. {originalBatteryItem?.price.toLocaleString()})</p>
            </div>
            <div>
                <Label>Manufacturing Code</Label>
                <p className="font-semibold">{originalBatteryItem?.manufacturingCode || 'Not Recorded'}</p>
            </div>
          </div>
          
           <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="replacement-battery">Select Replacement Battery</Label>
                     <Select onValueChange={(id) => setSelectedReplacementBattery(batteries?.find(b => b.id === id) || null)}>
                        <SelectTrigger id="replacement-battery">
                            <SelectValue placeholder="Select a battery from stock..." />
                        </SelectTrigger>
                        <SelectContent>
                            {batteriesLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : batteries?.map(battery => (
                                <SelectItem key={battery.id} value={battery.id} disabled={battery.stock <= 0}>
                                    {battery.brand} {battery.model} ({battery.ampere}Ah) - Stock: {battery.stock}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="service-charges">Optional Service Charges (Rs.)</Label>
                    <Input id="service-charges" type="number" value={serviceCharges} onChange={e => setServiceCharges(Number(e.target.value))} placeholder="e.g., for acid or charging"/>
                </div>
           </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 border rounded-md">
                 <div>
                    <Label className="text-sm text-muted-foreground">Original Price</Label>
                    <p className="font-bold text-lg">Rs. {originalBatteryItem?.price.toLocaleString() || '0'}</p>
                 </div>
                 <div>
                    <Label className="text-sm text-muted-foreground">New Battery Price</Label>
                    <p className="font-bold text-lg">Rs. {selectedReplacementBattery?.salePrice.toLocaleString() || '0'}</p>
                 </div>
                 <div>
                    <Label className="text-sm text-muted-foreground">Price Difference</Label>
                    <p className={`font-bold text-lg ${priceDifference < 0 ? 'text-green-600' : 'text-destructive'}`}>
                        Rs. {priceDifference.toLocaleString()}
                    </p>
                 </div>
                 <div className="bg-primary/10 p-2 rounded-md">
                    <Label className="text-sm text-primary">Total Payable</Label>
                    <p className="font-bold text-xl text-primary">Rs. {totalPayable.toLocaleString()}</p>
                 </div>
            </div>

             {totalPayable > 0 && (
                 <div className="space-y-4 rounded-md border p-4">
                    <div className="flex items-center gap-4">
                        <Label>Payment Status</Label>
                        <RadioGroup value={isPaid ? 'paid' : 'unpaid'} onValueChange={(val) => setIsPaid(val === 'paid')} className="flex gap-4">
                             <div className="flex items-center space-x-2"><RadioGroupItem value="paid" id="paid" /><Label htmlFor="paid">Paid</Label></div>
                             <div className="flex items-center space-x-2"><RadioGroupItem value="unpaid" id="unpaid" /><Label htmlFor="unpaid">Unpaid</Label></div>
                        </RadioGroup>
                    </div>

                    {isPaid && (
                        <div className="space-y-4">
                            <Label>Payment Method</Label>
                            <RadioGroup value={paymentMethod} onValueChange={(val: 'cash' | 'online') => setPaymentMethod(val)} className="flex gap-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="cash" /><Label htmlFor="cash">Cash</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="online" id="online" /><Label htmlFor="online">Online</Label></div>
                            </RadioGroup>
                            {paymentMethod === 'online' && (<div className="grid gap-2"><Label htmlFor="online-source">Bank/Service</Label><Select value={onlinePaymentSource} onValueChange={setOnlinePaymentSource}><SelectTrigger id="online-source"><SelectValue placeholder="Select a payment source" /></SelectTrigger><SelectContent>{onlinePaymentProviders.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>)}
                        </div>
                    )}
                 </div>
             )}

            <div className="space-y-2">
                <Label htmlFor="notes">Claim Notes (Optional)</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Battery was dead on arrival, replaced with new one."/>
            </div>

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/sales?tab=battery">Cancel</Link>
          </Button>
          <Button onClick={handleSaveClaim} disabled={isSaving || !selectedReplacementBattery}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving Claim...' : 'Confirm & Save Claim'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
