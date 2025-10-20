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
import { getProducts, getDealers, getPurchases, type Product, type Dealer, type Purchase } from '@/lib/data';
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

interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  costPrice: number;
  isNew?: boolean;
}

export default function PurchaseFormPage() {
    const [purchase, setPurchase] = useState<Purchase | null>(null);
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [dealers, setDealers] = useState<Dealer[]>([]);
    
    const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(new Date());
    const [purchaseTime, setPurchaseTime] = useState(format(new Date(), 'HH:mm'));
    const [status, setStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
    const [receiptImageUrl, setReceiptImageUrl] = useState<string | undefined>(undefined);
    
    const params = useParams();
    const router = useRouter();
    const purchaseId = params.id as string;
    const isNew = purchaseId === 'new';

    useEffect(() => {
        getProducts().then(setProducts);
        getDealers().then(setDealers);
        if (!isNew) {
            getPurchases().then(allPurchases => {
                const currentPurchase = allPurchases.find(p => p.id === purchaseId);
                if (currentPurchase) {
                    setPurchase(currentPurchase);
                    setSelectedDealer(currentPurchase.dealer);
                    setInvoiceNumber(currentPurchase.invoiceNumber);
                    const transactionDate = new Date(currentPurchase.date);
                    setPurchaseDate(transactionDate);
                    setPurchaseTime(format(transactionDate, 'HH:mm'));
                    setStatus(currentPurchase.status);
                    setPurchaseItems(currentPurchase.items.map(item => ({...item, isNew: !products.some(p => p.id === item.productId)})));
                    setReceiptImageUrl(currentPurchase.receiptImageUrl);
                } else {
                    router.push('/purchase');
                }
            });
        }
    }, [purchaseId, isNew, router, products]);

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
    
    const addNewProduct = () => {
        const newId = `new-${Date.now()}`;
        setPurchaseItems([
            ...purchaseItems,
            {
                productId: newId,
                name: 'New Product',
                quantity: 1,
                costPrice: 0,
                isNew: true,
            }
        ]);
    };

    const updatePurchaseItem = (productId: string, field: 'name' | 'quantity' | 'costPrice', value: string | number) => {
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
                    <Select onValueChange={(dealerId) => setSelectedDealer(dealers.find(d => d.id === dealerId) || null)} value={selectedDealer?.id}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a dealer" />
                        </SelectTrigger>
                        <SelectContent>
                            {dealers.map(dealer => (
                                <SelectItem key={dealer.id} value={dealer.id}>{dealer.name} ({dealer.company})</SelectItem>
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
                                    {products.map((product) => (
                                        <CommandItem
                                        key={product.id}
                                        onSelect={() => handleProductSelect(product)}
                                        >
                                        {product.name} ({product.brand})
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <Button variant="secondary" onClick={addNewProduct}>
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
                                            onChange={e => updatePurchaseItem(item.productId, 'quantity', parseInt(e.target.value) || 1)} 
                                            className="w-20"
                                            min="1"
                                        />
                                    </TableCell>
                                     <TableCell>
                                        <Input 
                                            type="number" 
                                            value={item.costPrice} 
                                            onChange={e => updatePurchaseItem(item.productId, 'costPrice', parseFloat(e.target.value) || 0)} 
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
          <Button>Save Purchase</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
