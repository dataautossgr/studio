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
import { Trash2, PlusCircle, UserPlus, Calendar as CalendarIcon, Search } from 'lucide-react';
import { type Product, type Customer, type Sale } from '@/lib/data';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useParams, useRouter } from 'next/navigation';
import { CustomerDialog } from '@/app/customers/customer-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
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
import { useFirestore, useCollection, addDocumentNonBlocking, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, getDoc, getCountFromServer } from 'firebase/firestore';


interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  costPrice: number;
  stock: number;
  isOneTime: boolean;
}

const onlinePaymentProviders = ["Easypaisa", "Jazzcash", "Meezan Bank", "Nayapay", "Sadapay", "Upaisa", "Islamic Bank"];


export default function SaleFormPage() {
  const [sale, setSale] = useState<Sale | null>(null);
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
  const [cashReceived, setCashReceived] = useState(0);


  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isWalkInUnpaidDialogOpen, setIsWalkInUnpaidDialogOpen] = useState(false);
  const { toast } = useToast();

  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();

  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

  const saleId = params.id as string;
  const isNew = saleId === 'new';

 useEffect(() => {
    if (customersLoading || productsLoading || !firestore || isNew) return;

    const fetchSale = async () => {
        const saleRef = doc(firestore, 'sales', saleId);
        const saleSnap = await getDoc(saleRef);

        if (saleSnap.exists()) {
            const currentSale = saleSnap.data() as Sale;
            setSale(currentSale);

            const customerRef = currentSale.customer as any;
            if (customerRef && customerRef.id) {
                const customerSnap = await getDoc(customerRef);
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


            setStatus(currentSale.status);
            const subtotal = currentSale.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
            setDiscount(subtotal - currentSale.total);

            if (products) {
              const cartItems = await Promise.all(currentSale.items.map(async (item) => {
                  const product = products.find(p => p.id === item.productId);
                  return {
                      id: item.productId,
                      name: item.name,
                      quantity: item.quantity,
                      price: item.price,
                      costPrice: product?.costPrice || 0,
                      stock: product?.stock || 0,
                      isOneTime: !product
                  };
              }));
              setCart(cartItems);
            }

            if (currentSale.status === 'Paid') {
                setPaymentMethod(currentSale.paymentMethod || 'cash');
                setOnlinePaymentSource(currentSale.onlinePaymentSource || '');
            } else {
                setPaymentMethod(null);
            }
            if (currentSale.status === 'Partial') {
                setPartialAmount(currentSale.partialAmountPaid || 0);
            }
            
            const transactionDate = new Date(currentSale.date);
            setSaleDate(transactionDate);
            setSaleTime(format(transactionDate, 'HH:mm'));

        } else {
             router.push('/sales');
        }
    };

    fetchSale();
  }, [saleId, isNew, router, firestore, products, customersLoading, productsLoading]);


  const handleProductSelect = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          quantity: 1,
          price: product.salePrice,
          costPrice: product.costPrice,
          stock: product.stock,
          isOneTime: false,
        },
      ]);
    }
  };

  const addOneTimeProduct = () => {
    const newId = `onetime-${Date.now()}`;
    setCart([
      ...cart,
      {
        id: newId,
        name: 'One-Time Product',
        quantity: 1,
        price: 0,
        costPrice: 0,
        stock: 0,
        isOneTime: true,
      },
    ]);
  };
  
  const updateCartItem = (id: string, field: keyof CartItem, value: any) => {
    setCart(
      cart.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };
  
  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const handleSaveNewCustomer = (customerData: Omit<Customer, 'id' | 'balance' | 'type'>) => {
    const newCustomerWithDefaults = { 
      ...customerData, 
      balance: 0,
      type: 'registered' as const
    };
    addDocumentNonBlocking(collection(firestore, 'customers'), newCustomerWithDefaults)
        .then(docRef => {
            if(docRef) {
                const newCustomer = { ...newCustomerWithDefaults, id: docRef.id };
                setSelectedCustomer(newCustomer);
                toast({ title: "Success", description: "New customer has been registered." });
                setIsCustomerDialogOpen(false);
            }
        });
  };

  const handleSaveAndPrint = () => {
    preSaveValidation(true);
  };
  
  const handleSaveOnly = () => {
    preSaveValidation(false);
  };

  const preSaveValidation = (print: boolean) => {
    if (!saleDate) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please select a sale date." });
        return;
    }
    if (cart.length === 0) {
        toast({ variant: "destructive", title: "Validation Error", description: "Cart cannot be empty." });
        return;
    }
     if (customerType === 'registered' && !selectedCustomer) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please select a registered customer." });
        return;
    }
    if (customerType === 'walk-in' && !customerName) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please enter a name for the walk-in customer." });
        return;
    }

    // New logic for walk-in unpaid
    if (customerType === 'walk-in' && (status === 'Unpaid' || status === 'Partial')) {
        setIsWalkInUnpaidDialogOpen(true);
    } else {
        handleSaveSale(print);
    }
  };


  const handleSaveSale = async (print = false) => {
    if (!firestore || !saleDate) return;

    const finalSaleDate = new Date(saleDate);
    const [hours, minutes] = saleTime.split(':').map(Number);
    finalSaleDate.setHours(hours, minutes);

    const dueAmount = finalAmount - (status === 'Partial' ? partialAmount : 0);

    const saleData = {
        date: finalSaleDate.toISOString(),
        total: finalAmount,
        status: status,
        discount,
        items: cart.map(item => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
        })),
        paymentMethod: status === 'Paid' ? paymentMethod : null,
        onlinePaymentSource: status === 'Paid' && paymentMethod === 'online' ? onlinePaymentSource : '',
        partialAmountPaid: status === 'Partial' ? partialAmount : 0,
    };
    
    const batch = writeBatch(firestore);

    let customerRef;

    if (customerType === 'registered' && selectedCustomer) {
        customerRef = doc(firestore, 'customers', selectedCustomer.id);
        if (status !== 'Paid') {
            const balanceChange = isNew ? dueAmount : dueAmount - ((sale?.total || 0) - (sale?.partialAmountPaid || 0));
            batch.update(customerRef, { balance: (selectedCustomer.balance || 0) + balanceChange });
        }
    } else {
        // This case handles walk-in customers (paid or converting to registered)
        const isConvertingToRegistered = customerType === 'walk-in' && (status === 'Unpaid' || status === 'Partial');
        customerRef = doc(collection(firestore, 'customers'));
        batch.set(customerRef, {
            name: customerName,
            phone: '',
            vehicleDetails: '',
            type: isConvertingToRegistered ? 'registered' : 'walk-in',
            balance: isConvertingToRegistered ? dueAmount : 0,
        });
    }

    cart.forEach(item => {
        if (!item.isOneTime && item.stock !== undefined) {
            const productRef = doc(firestore, 'products', item.id);
            const newStock = item.stock - item.quantity;
            batch.update(productRef, { stock: newStock });
        }
    });
    
    const finalSaleData: any = { ...saleData, customer: customerRef };
    
    if (isNew) {
        const salesCollectionRef = collection(firestore, 'sales');
        const salesSnapshot = await getCountFromServer(salesCollectionRef);
        const newInvoiceNumber = (salesSnapshot.data().count + 1).toString().padStart(3, '0');
        const newSaleRef = doc(salesCollectionRef);
        finalSaleData.invoice = `INV-${newInvoiceNumber}`;
        batch.set(newSaleRef, finalSaleData);
    } else {
        const saleRef = doc(firestore, 'sales', saleId);
        batch.update(saleRef, finalSaleData);
    }

    try {
        await batch.commit();
        toast({
          title: "Sale Saved",
          description: `Invoice has been saved successfully.`,
        });

        if (print) {
          // In a real app, you'd generate a proper invoice here before printing.
          setTimeout(() => window.print(), 500); 
        }
        
        setIsPrintDialogOpen(false);
        router.push('/sales');
    } catch (error) {
        console.error("Error saving sale:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save sale. Please try again.",
        });
    }
  };
  
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const finalAmount = subtotal - discount;
  const changeToReturn = paymentMethod === 'cash' && cashReceived > finalAmount ? cashReceived - finalAmount : 0;
  
  const pageTitle = isNew ? 'Create New Sale' : `Edit Sale - ${sale?.invoice || ''}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            {isNew ? 'Fill in the details to record a new transaction.' : 'Update the details of this transaction.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Section */}
           <div className="grid gap-4 md:grid-cols-3">
             <div className="space-y-2">
              <Label>Customer Type</Label>
              <Select
                value={customerType}
                onValueChange={(val: 'walk-in' | 'registered') => {
                    setCustomerType(val);
                    setSelectedCustomer(null);
                    setCustomerName('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  <SelectItem value="registered">Registered Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="customerName">
                    {customerType === 'walk-in' ? 'Customer Name' : 'Customer'}
                </Label>
                {customerType === 'walk-in' ? (
                    <Input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g., John Doe"
                    />
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
                                                <CommandItem
                                                    key={customer.id}
                                                    onSelect={() => {
                                                        setSelectedCustomer(customer)
                                                        const popoverTrigger = document.querySelector('[aria-controls="radix-14"]');
                                                        if (popoverTrigger instanceof HTMLElement) popoverTrigger.click();
                                                    }}
                                                >
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
                            <span className="sr-only">Add New Customer</span>
                        </Button>
                    </div>
                )}
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <div className="space-y-2">
                  <Label>Sale Date</Label>
                   <Popover>
                      <PopoverTrigger asChild>
                      <Button
                          variant={"outline"}
                          className={cn(
                          "w-full justify-start text-left font-normal",
                          !saleDate && "text-muted-foreground"
                          )}
                      >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {saleDate ? format(saleDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                      <Calendar
                          mode="single"
                          selected={saleDate}
                          onSelect={setSaleDate}
                          initialFocus
                      />
                      </PopoverContent>
                  </Popover>
              </div>
              <div className="space-y-2">
                  <Label>Sale Time</Label>
                  <Input type="time" value={saleTime} onChange={e => setSaleTime(e.target.value)} />
              </div>
            </div>
          </div>
          
          {/* Product Selection */}
          <div className="space-y-2">
            <Label>Add Products</Label>
            <div className="flex gap-2">
              <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal text-muted-foreground">
                        <Search className="mr-2 h-4 w-4" />
                        Search inventory to add products...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search for product..." />
                      <CommandList>
                        <CommandEmpty>No products found.</CommandEmpty>
                        <CommandGroup>
                          {products?.map((product) => (
                            <CommandItem
                              key={product.id}
                              onSelect={() => handleProductSelect(product)}
                            >
                              <div className="flex w-full justify-between items-center">
                                <div>
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Purchase Cost: Rs. {product.costPrice.toLocaleString()}
                                    </p>
                                </div>
                                <span className="text-sm font-mono text-muted-foreground ml-4">
                                    Stock: {product.stock}
                                </span>
                            </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

              <Button variant="secondary" onClick={addOneTimeProduct}>
                <PlusCircle className="mr-2 h-4 w-4" /> One-Time Product
              </Button>
            </div>
          </div>
          
          {/* Cart Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Sale Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Your cart is empty.
                    </TableCell>
                  </TableRow>
                ) : (
                  cart.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.isOneTime ? (
                          <Input
                            value={item.name}
                            onChange={(e) =>
                              updateCartItem(item.id, 'name', e.target.value)
                            }
                            className="text-sm"
                            placeholder="Enter product name"
                          />
                        ) : (
                          <span className="font-medium">{item.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                          }
                          className="w-20"
                          min="1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            updateCartItem(item.id, 'price', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                          readOnly={!item.isOneTime}
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        Rs. {(item.quantity * item.price).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.id)}
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
          
          {/* Calculation Section */}
          <div className="grid gap-4 md:grid-cols-2">
             <div className="space-y-4">
               <div className="flex items-center gap-4">
                  <Label htmlFor="status" className="flex-shrink-0">Sale Status</Label>
                  <Select value={status} onValueChange={(val: 'Paid' | 'Unpaid' | 'Partial') => {
                      setStatus(val);
                      if (val !== 'Paid') {
                          setPaymentMethod(null);
                      } else {
                          setPaymentMethod(paymentMethod || 'cash');
                      }
                  }}>
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

                {status === 'Partial' && (
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4 rounded-md border p-4">
                        <Label htmlFor="partialAmount">Amount Paid</Label>
                        <Input
                            id="partialAmount"
                            type="number"
                            value={partialAmount}
                            onChange={(e) => setPartialAmount(parseFloat(e.target.value) || 0)}
                            className="w-full"
                            min="0"
                            max={finalAmount}
                        />
                    </div>
                )}
               
               {status === 'Paid' && (
                <div className="space-y-4 rounded-md border p-4">
                    <Label>Payment Method</Label>
                    <RadioGroup value={paymentMethod || ''} onValueChange={(val: 'cash' | 'online') => setPaymentMethod(val)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="cash" id="cash" />
                            <Label htmlFor="cash">Cash</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="online" id="online" />
                            <Label htmlFor="online">Online</Label>
                        </div>
                    </RadioGroup>
                    {paymentMethod === 'online' && (
                        <div className="grid gap-2">
                             <Label htmlFor="online-source">Bank/Service</Label>
                             <Select value={onlinePaymentSource} onValueChange={setOnlinePaymentSource}>
                                <SelectTrigger id="online-source">
                                    <SelectValue placeholder="Select a payment source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {onlinePaymentProviders.map(provider => (
                                        <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                        </div>
                    )}
                    {paymentMethod === 'cash' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cashReceived">Cash Received</Label>
                                <Input 
                                    id="cashReceived"
                                    type="number"
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Change</Label>
                                <p className="font-bold text-lg h-10 flex items-center">
                                    Rs. {changeToReturn.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
               )}
            </div>
            <div className="space-y-2 text-right">
                <div className="flex justify-end items-center gap-4">
                    <Label>Subtotal</Label>
                    <p className="font-semibold w-32">Rs. {subtotal.toLocaleString()}</p>
                </div>
                <div className="flex justify-end items-center gap-4">
                    <Label htmlFor="discount">Discount</Label>
                    <Input 
                        id="discount"
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="w-32"
                    />
                </div>
                 <div className="flex justify-end items-center gap-4 text-lg font-bold">
                    <Label>Final Amount</Label>
                    <p className="w-32">Rs. {finalAmount.toLocaleString()}</p>
                </div>
                {status === 'Partial' && finalAmount > partialAmount && (
                    <div className="flex justify-end items-center gap-4 text-destructive">
                        <Label>Remaining Balance</Label>
                        <p className="font-semibold w-32">Rs. {(finalAmount - partialAmount).toLocaleString()}</p>
                    </div>
                )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push('/sales')}>Cancel</Button>
          <Button onClick={() => setIsPrintDialogOpen(true)}>Save Sale</Button>
        </CardFooter>
      </Card>
      <CustomerDialog 
        isOpen={isCustomerDialogOpen} 
        onClose={() => setIsCustomerDialogOpen(false)}
        onSave={handleSaveNewCustomer}
        customer={null}
      />
      <AlertDialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Save Sale</AlertDialogTitle>
            <AlertDialogDescription>
                Do you want to print an invoice for this sale?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogAction onClick={() => preSaveValidation(true)}>Save & Print</AlertDialogAction>
            <AlertDialogCancel onClick={() => preSaveValidation(false)}>Save Only</AlertDialogCancel>
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
                <AlertDialogAction onClick={() => {
                    setIsWalkInUnpaidDialogOpen(false);
                    handleSaveSale(false); // isPrint is false, can be connected to print dialog later
                }}>
                    Yes, Register Customer
                </AlertDialogAction>
                <AlertDialogCancel>No, Cancel Sale</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}

    