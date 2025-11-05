'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Trash2, Search, PlusCircle, Upload } from 'lucide-react';
import { type Product, type Dealer, type Purchase } from '@/lib/data';
import { ProductDialog } from '../../inventory/product-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useParams, useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Image from 'next/image';
import { useCollection, useDoc, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, getDoc, type DocumentReference, runTransaction, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  costPrice: number;
  isNew?: boolean;
}

export default function AutomotivePurchaseForm() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const purchaseId = params.id as string | undefined;
    const isNew = !purchaseId || purchaseId === 'new';
    
    const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
    const dealersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'dealers') : null, [firestore]);
    const purchaseRef = useMemoFirebase(() => isNew || !firestore || !purchaseId ? null : doc(firestore, 'purchases', purchaseId), [isNew, purchaseId, firestore]);
    
    const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection);
    const { data: dealers, isLoading: isLoadingDealers } = useCollection<Dealer>(dealersCollection);
    const { data: purchase, isLoading: isLoadingPurchase } = useDoc<Purchase>(purchaseRef);
    
    const automotiveDealers = useMemo(() => dealers?.filter(d => d.type === 'automotive') || [], [dealers]);

    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
    const [originalPurchaseItems, setOriginalPurchaseItems] = useState<PurchaseItem[]>([]);
    const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(new Date());
    const [purchaseTime, setPurchaseTime] = useState(format(new Date(), 'HH:mm'));
    const [status, setStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
    const [dueDate, setDueDate] = useState<Date | undefined>();
    const [receiptImageUrl, setReceiptImageUrl] = useState<string | undefined>(undefined);
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
    
    useEffect(() => {
        if (!isNew && purchase && products && dealers) {
            const fetchPurchaseData = async () => {
                if (purchase.dealer) {
                    const dealerSnap = await getDoc(purchase.dealer as DocumentReference);
                    if (dealerSnap.exists()) {
                        setSelectedDealer({ id: dealerSnap.id, ...dealerSnap.data() } as Dealer);
                    }
                }
                setInvoiceNumber(purchase.invoiceNumber);
                const transactionDate = new Date(purchase.date);
                setPurchaseDate(transactionDate);
                setPurchaseTime(format(transactionDate, 'HH:mm'));
                setStatus(purchase.status);
                if (purchase.dueDate) setDueDate(new Date(purchase.dueDate));
                const items = purchase.items.map(item => ({...item, isNew: !products.some(p => p.id === item.productId)}));
                setPurchaseItems(items);
                setOriginalPurchaseItems(items); // Store original state for stock calculation
                setReceiptImageUrl(purchase.receiptImageUrl);
            };
            fetchPurchaseData();
        }
    }, [isNew, purchase, products, dealers]);

    const handleProductSelect = (product: Product) => {
        const existingItem = purchaseItems.find((item) => item.productId === product.id);
        if (existingItem) {
          setPurchaseItems(
            purchaseItems.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          );
        } else {
          setPurchaseItems([
            ...purchaseItems,
            {
              productId: product.id,
              name: product.name,
              quantity: 1,
              costPrice: product.costPrice,
              isNew: false,
            },
          ]);
        }
    };
    
    const handleSaveNewProduct = async (productData: Omit<Product, 'id'>) => {
        if (!firestore) return;
    
        const isDuplicate = products?.some(
          p => p.name.toLowerCase() === productData.name.toLowerCase() &&
               p.brand.toLowerCase() === productData.brand.toLowerCase() &&
               p.model.toLowerCase() === productData.model.toLowerCase()
        );
    
        if (isDuplicate) {
          toast({
            variant: "destructive",
            title: "Failed to Add Product",
            description: "A product with the same name, brand, and model already exists.",
          });
          return;
        }
        
        try {
            const newDocRef = doc(collection(firestore, 'products'));
            await setDoc(newDocRef, productData);

            toast({
                title: "Success",
                description: "Product has been added to inventory.",
            });
            
            const newProduct: PurchaseItem = {
                productId: newDocRef.id,
                name: productData.name,
                quantity: 1,
                costPrice: productData.costPrice,
                isNew: false
            };
            setPurchaseItems(prev => [...prev, newProduct]);
            setIsProductDialogOpen(false);
        } catch(error) {
            console.error("Error adding new product:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not add the new product.",
            });
        }
    };

    const updatePurchaseItem = (productId: string, field: 'name' | 'quantity' | 'costPrice', value: string | number) => {
        if (field === 'quantity' || field === 'costPrice') {
          value = parseFloat(value as string) || 0;
        }
        setPurchaseItems(
            purchaseItems.map((item) => (item.productId === productId ? { ...item, [field]: value } : item))
        );
    };

    const removeFromPurchase = (productId: string) => {
        setPurchaseItems(purchaseItems.filter((item) => item.productId !== productId));
    };

    const totalAmount = useMemo(() => {
        return purchaseItems.reduce((acc, item) => acc + item.costPrice * item.quantity, 0);
    }, [purchaseItems]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setReceiptImageUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
    };

    const handleSavePurchase = async () => {
      if (!firestore || !selectedDealer || purchaseItems.length === 0 || !purchaseDate) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a dealer, a date, and add at least one item.' });
        return;
      }
  
      try {
        await runTransaction(firestore, async (transaction) => {
          const dealerRef = doc(firestore, 'dealers', selectedDealer.id);
          const dealerDoc = await transaction.get(dealerRef);
          if (!dealerDoc.exists()) throw new Error("Dealer not found!");
  
          // Step 1: Update product stocks
          for (const item of purchaseItems) {
            if (!item.isNew) {
              const productRef = doc(firestore, 'products', item.productId);
              const productDoc = await transaction.get(productRef);
              const currentStock = productDoc.exists() ? (productDoc.data() as Product).stock : 0;
  
              const originalItem = originalPurchaseItems.find(p => p.productId === item.productId);
              const stockChange = item.quantity - (originalItem?.quantity || 0);
              
              const newStock = isNew ? currentStock + item.quantity : currentStock + stockChange;
              transaction.update(productRef, { stock: newStock });
            }
          }
  
          // Step 2: Prepare purchase data
          const finalPurchaseDate = new Date(purchaseDate);
          const [hours, minutes] = purchaseTime.split(':').map(Number);
          finalPurchaseDate.setHours(hours, minutes);
  
          const purchaseData: Omit<Purchase, 'id'> = {
            dealer: dealerRef,
            invoiceNumber: invoiceNumber,
            date: finalPurchaseDate.toISOString(),
            total: totalAmount,
            status: status,
            receiptImageUrl: receiptImageUrl || '',
            items: purchaseItems.map(i => ({ productId: i.productId, name: i.name, quantity: i.quantity, costPrice: i.costPrice })),
            dueDate: status !== 'Paid' ? dueDate?.toISOString() : undefined,
          };
  
          // Step 3: Create or update purchase document
          const purchaseDocRef = isNew ? doc(collection(firestore, 'purchases')) : doc(firestore, 'purchases', purchaseId!);
          transaction.set(purchaseDocRef, purchaseData);
          
          // Step 4: Update dealer balance
          let balanceChange = 0;
          if (status !== 'Paid') {
            const originalTotal = purchase?.total || 0;
            const originalStatus = purchase?.status || 'Paid';
            const originalDue = (originalStatus === 'Unpaid' || originalStatus === 'Partial') ? originalTotal : 0;
            balanceChange = totalAmount - originalDue;
          } else { // if status is Paid
            const originalTotal = purchase?.total || 0;
            const originalStatus = purchase?.status || 'Paid';
            const originalDue = (originalStatus === 'Unpaid' || originalStatus === 'Partial') ? originalTotal : 0;
            balanceChange = 0 - originalDue;
          }
          
          if(balanceChange !== 0){
             const newBalance = (dealerDoc.data()?.balance || 0) + balanceChange;
             transaction.update(dealerRef, { balance: newBalance });
          }

        });
  
        toast({ title: isNew ? "Purchase Created" : "Purchase Updated", description: "Stock and dealer balances have been updated." });
        router.push('/purchase');
  
      } catch (error) {
        console.error("Failed to save purchase:", error);
        toast({ variant: 'destructive', title: 'Error', description: (error as Error).message || 'Could not save the purchase.' });
      }
    };


    const pageTitle = isNew ? 'Create New Purchase' : `Edit Purchase - ${purchase?.invoiceNumber}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            {isNew ? 'Fill in the details to record a new purchase.' : 'Update the details of this purchase.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                    <Label>Dealer</Label>
                    <Select onValueChange={(dealerId) => setSelectedDealer(automotiveDealers?.find(d => d.id === dealerId) || null)} value={selectedDealer?.id}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a dealer" />
                        </SelectTrigger>
                        <SelectContent>
                            {automotiveDealers?.map(dealer => (
                                <SelectItem key={dealer.id} value={dealer.id}>{dealer.company}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Supplier Invoice #</Label>
                    <Input id="invoiceNumber" placeholder="e.g., INV-12345" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                        <Label>Purchase Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !purchaseDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {purchaseDate ? format(purchaseDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={purchaseDate}
                                onSelect={setPurchaseDate}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label>Purchase Time</Label>
                        <Input type="time" value={purchaseTime} onChange={e => setPurchaseTime(e.target.value)} />
                    </div>
                 </div>
            </div>

            <div className="space-y-2">
                <Label>Add Products</Label>
                <div className="flex gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal text-muted-foreground">
                                <Search className="mr-2 h-4 w-4" /> Search inventory to add products...
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search for product by name, brand, model..." />
                                <CommandList>
                                    <CommandEmpty>No products found.</CommandEmpty>
                                    <CommandGroup>
                                    {products?.map((product) => (
                                        <CommandItem
                                        key={product.id}
                                        onSelect={() => {
                                          handleProductSelect(product)
                                          document.body.click();
                                        }}
                                        className="cursor-pointer"
                                        >
                                        {product.name} ({product.brand})
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <Button variant="secondary" onClick={() => setIsProductDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Product
                    </Button>
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/2">Product</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Purchase Cost</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {purchaseItems.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No products added to purchase.
                                </TableCell>
                            </TableRow>
                        ) : (
                            purchaseItems.map(item => (
                                <TableRow key={item.productId}>
                                    <TableCell className="font-medium">
                                        {item.isNew ? (
                                            <Input
                                                value={item.name}
                                                onChange={(e) => updatePurchaseItem(item.productId, 'name', e.target.value)}
                                                placeholder="Enter product name"
                                            />
                                        ) : (
                                            item.name
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            value={item.quantity} 
                                            onChange={e => updatePurchaseItem(item.productId, 'quantity', e.target.value)} 
                                            className="w-20"
                                            step="0.1"
                                            min="0"
                                        />
                                    </TableCell>
                                     <TableCell>
                                        <Input 
                                            type="number" 
                                            value={item.costPrice} 
                                            onChange={e => updatePurchaseItem(item.productId, 'costPrice', e.target.value)} 
                                            className="w-24"
                                            min="0"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">Rs. {(item.quantity * item.costPrice).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeFromPurchase(item.productId)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                     <div className="flex items-center gap-4">
                        <Label htmlFor="status" className="flex-shrink-0">Purchase Status</Label>
                        <Select value={status} onValueChange={(val: 'Paid' | 'Unpaid' | 'Partial') => setStatus(val)}>
                            <SelectTrigger>
                            <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Unpaid">Unpaid</SelectItem>
                            <SelectItem value="Partial">Partial</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     {(status === 'Unpaid' || status === 'Partial') && (
                        <div className="space-y-2">
                            <Label>Payment Due Date (Optional)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !dueDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDate ? format(dueDate, "PPP") : <span>Set a due date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={dueDate}
                                    onSelect={setDueDate}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="receipt-upload">Upload Bill / Receipt (Optional)</Label>
                        <div className="flex items-center gap-4">
                            {receiptImageUrl ? (
                                <Image
                                    src={receiptImageUrl}
                                    alt="Receipt preview"
                                    width={80}
                                    height={80}
                                    className="rounded-md aspect-square object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                </div>
                            )}
                            <Input id="receipt-upload" type="file" accept="image/*" onChange={handleImageChange} className="text-xs max-w-sm" />
                        </div>
                    </div>
                </div>
                <div className="space-y-2 text-right">
                    <div className="flex justify-end items-center gap-4 text-lg font-bold">
                        <Label>Total Amount</Label>
                        <p className="w-32">Rs. {totalAmount.toLocaleString()}</p>
                    </div>
                </div>
            </div>

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push('/purchase')}>Cancel</Button>
          <Button onClick={handleSavePurchase}>Save Purchase</Button>
        </CardFooter>
      </Card>
      <ProductDialog 
        isOpen={isProductDialogOpen}
        onClose={() => setIsProductDialogOpen(false)}
        onSave={handleSaveNewProduct}
        product={null}
      />
    </div>
  );
}
