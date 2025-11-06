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
import { type Product, type Customer, type Sale, type BankAccount } from '@/lib/data';
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
import { collection, doc, serverTimestamp, writeBatch, getDoc, getCountFromServer, DocumentReference } from 'firebase/firestore';


interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  costPrice: number;
  stock: number;
  isOneTime: boolean;
}

export default function AutomotiveSaleForm() {
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
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [cashReceived, setCashReceived] = useState(0);


  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isWalkInUnpaidDialogOpen, setIsWalkInUnpaidDialogOpen] = useState(false);
  const { toast } = useToast();

  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();

  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const bankAccountsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'my_bank_accounts') : null, [firestore]);
  
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: bankAccounts, isLoading: bankAccountsLoading } = useCollection<BankAccount>(bankAccountsCollection);
  
  const automotiveCustomers = useMemo(() => customers?.filter(c => c.type === 'automotive') || [], [customers]);


  const saleId = params.id as string;
  const isNew = saleId === 'new' || !saleId; // Treat no ID as new

 useEffect(() => {
    if (customersLoading || productsLoading || !firestore || isNew) return;

    const fetchSale = async () => {
        const saleRef = doc(firestore, 'sales', saleId);
        const saleSnap = await getDoc(saleRef);

        if (saleSnap.exists()) {
            const currentSale = { id: saleSnap.id, ...saleSnap.data() } as Sale;
            setSale(currentSale);

            const customerRef = currentSale.customer as any;
            if (customerRef && customerRef.id) {
                const customerSnap = await getDoc(customerRef);
                if (customerSnap.exists()) {
                    const data = customerSnap.data();
                    if (data && typeof data === "object") {
                        const customerData = { id: customerSnap.id, ...data } as Customer;
                        setCustomerType('registered');
                        setSelectedCustomer(customerData);
                    } else {
                        console.error("Invalid customer data:", data);
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
            if(currentSale.dueDate) setDueDate(new Date(currentSale.dueDate));

        } else {
             router.push('/sales');
        }
    };
    if(saleId) {
      fetchSale();
    }
  }, [saleId, isNew, router, firestore, products, customers, customersLoading, productsLoading]);


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
    if (field === 'quantity' || field === 'price') {
      value = parseFloat(value) || 0;
    }
    setCart(
      cart.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };
  
  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const handleSaveNewCustomer = (customerData: Omit<Customer, 'id' | 'balance' | 'type'>) => {
    if (!firestore) return;
    const newCustomerWithDefaults = { 
      ...customerData, 
      balance: 0,
      type: 'automotive' as const
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

  const preSaveValidation = (print: boolean) => {
    if (!saleDate || cart.length === 0 || (customerType === 'registered' && !selectedCustomer) || (customerType === 'walk-in' && !customerName)) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please fill all required fields." });
        return;
    }
    if (paymentMethod === 'online' && !onlinePaymentSource) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please select a bank account for online payment." });
        return;
    }
    if (customerType === 'walk-in' && (status === 'Unpaid' || status === 'Partial')) {
        setIsWalkInUnpaidDialogOpen(true);
    } else {
        handleSaveSale(print);
    }
  };

  const handleSaveSale = async (print = false) => {
    if (!firestore || !saleDate) return;
    const batch = writeBatch(firestore);
    
    try {
        const finalSaleDate = new Date(saleDate);
        const [hours, minutes] = saleTime.split(':').map(Number);
        finalSaleDate.setHours(hours, minutes);

        let customerRef;
        if (customerType === 'registered' && selectedCustomer) {
            customerRef = doc(firestore, 'customers', selectedCustomer.id);
        } else {
            const newCustomerRef = doc(collection(firestore, 'customers'));
            const isConverting = customerType === 'walk-in' && (status === 'Unpaid' || status === 'Partial');
            const customerPayload: Omit<Customer, 'id'> = {
                name: customerName, phone: '', vehicleDetails: '', type: 'automotive',
                balance: isConverting ? (finalAmount - partialAmount) : 0,
            };
            batch.set(newCustomerRef, customerPayload);
            customerRef = newCustomerRef;
        }

        const saleRef = isNew ? doc(collection(firestore, 'sales')) : doc(firestore, 'sales', saleId);
        
        const saleData = {
            date: finalSaleDate.toISOString(),
            total: finalAmount,
            status,
            discount,
            customer: customerRef,
            items: cart.map(item => ({ productId: item.id, name: item.name, quantity: item.quantity, price: item.price })),
            ...(status !== 'Paid' && dueDate && { dueDate: dueDate.toISOString() }),
            ...( (status === 'Paid' || status === 'Partial') && { paymentMethod }),
            ...( paymentMethod === 'online' && { onlinePaymentSource }),
            ...( status === 'Partial' && { partialAmountPaid: partialAmount }),
        };

        if (isNew) {
            const salesSnapshot = await getCountFromServer(collection(firestore, 'sales'));
            const newInvoiceNumber = (salesSnapshot.data().count + 1).toString().padStart(3, '0');
            batch.set(saleRef, { ...saleData, invoice: `INV-${newInvoiceNumber}` });
        } else {
            batch.update(saleRef, saleData);
        }

        // Update balances and stock
        if (status !== 'Paid' && selectedCustomer) {
            const dueAmount = finalAmount - partialAmount;
            const originalDue = isNew ? 0 : (sale?.total || 0) - (sale?.partialAmountPaid || 0);
            const balanceChange = dueAmount - originalDue;
            batch.update(customerRef, { balance: (selectedCustomer.balance || 0) + balanceChange });
        }

        cart.forEach(item => {
            if (!item.isOneTime) {
                const productRef = doc(firestore, 'products', item.id);
                batch.update(productRef, { stock: item.stock - item.quantity });
            }
        });
        
        // Update bank balance for online payments
        if (paymentMethod === 'online' && onlinePaymentSource) {
            const amountToCredit = status === 'Paid' ? finalAmount : partialAmount;
            if(amountToCredit > 0) {
                const bankRef = doc(firestore, 'my_bank_accounts', onlinePaymentSource);
                const bankSnap = await getDoc(bankRef);
                if (bankSnap.exists()) {
                    const currentBalance = bankSnap.data().balance;
                    const newBalance = currentBalance + amountToCredit;
                    batch.update(bankRef, { balance: newBalance });

                    const transactionRef = doc(collection(firestore, 'bank_transactions'));
                    batch.set(transactionRef, {
                        accountId: onlinePaymentSource,
                        date: finalSaleDate.toISOString(),
                        description: `Sale ${isNew ? saleRef.id : saleId}`,
                        type: 'Credit',
                        amount: amountToCredit,
                        balanceAfter: newBalance,
                        referenceId: saleRef.id,
                        referenceType: 'Sale'
                    });
                }
            }
        }
        
        await batch.commit();
        toast({ title: "Sale Saved", description: "Transaction recorded successfully." });
        if (print) { router.push(`/sales/invoice/${saleRef.id}`); } else { router.push('/sales'); }
    } catch (error) {
        console.error("Error saving sale:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to save sale." });
    }
  };
  
  const handleSaveAndPrint = () => {
    preSaveValidation(true);
  };
  const handleSaveOnly = () => {
      preSaveValidation(false);
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const finalAmount = subtotal - discount;
  const changeToReturn = paymentMethod === 'cash' && cashReceived > finalAmount ? cashReceived - finalAmount : 0;
  
  const pageTitle = isNew ? 'Create New Automotive Sale' : `Edit Sale - ${sale?.invoice || ''}`;

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            {isNew ? 'Fill in the details to record a new transaction.' : 'Update the details of this transaction.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                                            {automotiveCustomers.map((customer) => (
                                                <CommandItem
                                                    key={customer.id}
                                                    onSelect={() => {
                                                        setSelectedCustomer(customer);
                                                        document.body.click();
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
                              onSelect={() => {
                                handleProductSelect(product);
                                document.body.click();
                              }}
                            >
                              {product.name}
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
          
          <div className="border rounded-md">
            <Table>
              <TableHeader><TableRow><TableHead className="w-1/2">Product</TableHead><TableHead>Quantity</TableHead><TableHead>Sale Price</TableHead><TableHead>Total</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {cart.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Your cart is empty.</TableCell></TableRow>
                : cart.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.isOneTime ? <Input value={item.name} onChange={(e) => updateCartItem(item.id, 'name', e.target.value)} /> : <span className="font-medium">{item.name}</span>}</TableCell>
                      <TableCell><Input type="number" value={item.quantity} onChange={(e) => updateCartItem(item.id, 'quantity', e.target.value)} className="w-20" min="1"/></TableCell>
                      <TableCell><Input type="number" value={item.price} onChange={(e) => updateCartItem(item.id, 'price', e.target.value)} className="w-24" min="0"/></TableCell>
                      <TableCell className="text-right font-mono">Rs. {(item.quantity * item.price).toLocaleString()}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
             <div className="space-y-4">
               <div className="flex items-center gap-4">
                  <Label htmlFor="status" className="flex-shrink-0">Sale Status</Label>
                  <Select value={status} onValueChange={(val: 'Paid' | 'Unpaid' | 'Partial') => { setStatus(val); if (val !== 'Paid' && val !== 'Partial') setPaymentMethod(null); else setPaymentMethod(paymentMethod || 'cash'); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Unpaid">Unpaid</SelectItem><SelectItem value="Partial">Partial</SelectItem></SelectContent>
                  </Select>
               </div>
                {(status === 'Unpaid' || status === 'Partial') && (
                     <div className="space-y-2">
                        <Label>Payment Due Date (Optional)</Label>
                        <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dueDate ? format(dueDate, "PPP") : <span>Set a due date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus/></PopoverContent></Popover>
                    </div>
                )}
                {status === 'Partial' && (<div className="grid grid-cols-[120px_1fr] items-center gap-4 rounded-md border p-4"><Label htmlFor="partialAmount">Amount Paid</Label><Input id="partialAmount" type="number" value={partialAmount} onChange={(e) => setPartialAmount(parseFloat(e.target.value) || 0)} className="w-full" min="0" max={finalAmount}/></div>)}
               
               {(status === 'Paid' || status === 'Partial') && (
                <div className="space-y-4 rounded-md border p-4">
                    <Label>Payment Method</Label>
                    <RadioGroup value={paymentMethod || ''} onValueChange={(val: 'cash' | 'online') => setPaymentMethod(val)} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="cash" /><Label htmlFor="cash">Cash</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="online" id="online" /><Label htmlFor="online">Online</Label></div>
                    </RadioGroup>
                    {paymentMethod === 'online' && (
                        <div className="grid gap-2"><Label htmlFor="online-source">Receiving Account</Label>
                            <Select value={onlinePaymentSource} onValueChange={setOnlinePaymentSource}>
                                <SelectTrigger id="online-source"><SelectValue placeholder="Select an account" /></SelectTrigger>
                                <SelectContent>{bankAccountsLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : bankAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.bankName} ({acc.accountTitle})</SelectItem>)}</SelectContent>
                            </Select>
                        </div>)}
                    {paymentMethod === 'cash' && (<div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="cashReceived">Cash Received</Label><Input id="cashReceived" type="number" value={cashReceived} onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}/></div><div className="space-y-2"><Label>Change</Label><p className="font-bold text-lg h-10 flex items-center">Rs. {changeToReturn.toLocaleString()}</p></div></div>)}
                </div>
               )}
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
          <Button variant="outline" onClick={() => router.push('/sales')}>Cancel</Button>
          <Button onClick={handleSaveAndPrint}>Save &amp; Print</Button>
          <Button onClick={handleSaveOnly}>Save Only</Button>
        </CardFooter>
      </Card>
      <CustomerDialog isOpen={isCustomerDialogOpen} onClose={() => setIsCustomerDialogOpen(false)} onSave={handleSaveNewCustomer} customer={null} type="automotive"/>
      <AlertDialog open={isWalkInUnpaidDialogOpen} onOpenChange={setIsWalkInUnpaidDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Unpaid Sale for Walk-in Customer</AlertDialogTitle><AlertDialogDescription>This sale is marked as unpaid. Do you want to register '{customerName}' as a new customer to track their balance?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogAction onClick={() => { setIsWalkInUnpaidDialogOpen(false); handleSaveSale(false); }}>Yes, Register Customer</AlertDialogAction><AlertDialogCancel>No, Cancel Sale</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
