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
import { Trash2, PlusCircle, UserPlus, Calendar as CalendarIcon } from 'lucide-react';
import { getProducts, getCustomers, getSales, getPurchases, getDealers, type Product, type Customer, type Sale, type Purchase, type Dealer } from '@/lib/data';
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

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  costPrice: number;
  isOneTime: boolean;
}

const onlinePaymentProviders = ["Easypaisa", "Jazzcash", "Meezan Bank", "Nayapay", "Sadapay", "Upaisa", "Islamic Bank"];


export default function SaleFormPage() {
  const [sale, setSale] = useState<Sale | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  
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
  const { toast } = useToast();

  const params = useParams();
  const router = useRouter();
  const saleId = params.id as string;
  const isNew = saleId === 'new';

  useEffect(() => {
    Promise.all([
        getProducts(),
        getCustomers(),
        getSales(),
        getPurchases(),
        getDealers()
    ]).then(([productsData, customersData, allSales, purchasesData, dealersData]) => {
        setProducts(productsData);
        setCustomers(customersData);
        setPurchases(purchasesData);
        setDealers(dealersData);

        if (!isNew) {
            const currentSale = allSales.find(s => s.id === saleId);
            if (currentSale) {
                setSale(currentSale);
                setCustomerType(currentSale.customer.type);
                if (currentSale.customer.type === 'registered') {
                    setSelectedCustomer(currentSale.customer);
                } else {
                    setCustomerName(currentSale.customer.name);
                }
                setStatus(currentSale.status);
                const subtotal = currentSale.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
                setDiscount(subtotal - currentSale.total);

                setCart(currentSale.items.map(item => {
                    const product = productsData.find(p => p.id === item.productId);
                    return {
                        id: item.productId,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        costPrice: product?.costPrice || 0, 
                        isOneTime: !product
                    };
                }));

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
        }
    });
  }, [saleId, router, isNew]);


  const displayProducts = useMemo(() => {
    return products.map(product => {
        const productPurchases = purchases
            .filter(p => p.items.some(item => item.productId === product.id))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const lastPurchase = productPurchases[0];
        const dealer = lastPurchase ? dealers.find(d => d.id === lastPurchase.dealer.id) : null;
        
        return {
            ...product,
            lastPurchaseDate: lastPurchase ? format(new Date(lastPurchase.date), 'dd MMM, yy') : 'N/A',
            lastPurchaseDealer: dealer ? dealer.company : 'N/A',
        }
    })
  }, [products, purchases, dealers]);


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
    const newCustomer: Customer = { 
      ...customerData, 
      id: `CUST${Date.now()}`, 
      balance: 0,
      type: 'registered'
    };
    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    setSelectedCustomer(newCustomer);
    toast({ title: "Success", description: "New customer has been registered." });
    setIsCustomerDialogOpen(false);
  };
  
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const finalAmount = subtotal - discount;
  const changeToReturn = cashReceived > finalAmount ? cashReceived - finalAmount : 0;
  
  const pageTitle = isNew ? 'Create New Sale' : `Edit Sale - ${sale?.invoice}`;

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
                                            {customers.filter(c => c.type === 'registered').map((customer) => (
                                                <CommandItem
                                                    key={customer.id}
                                                    onSelect={() => setSelectedCustomer(customer)}
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
                    <Button variant="outline" className="w-full justify-start font-normal text-muted-foreground">Search inventory to add products...</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search for product..." />
                      <CommandList>
                        <CommandEmpty>No products found.</CommandEmpty>
                        <CommandGroup>
                          {displayProducts.map((product) => (
                            <CommandItem
                              key={product.id}
                              onSelect={() => handleProductSelect(product)}
                            >
                              <div className="flex w-full justify-between items-center">
                                <div>
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {product.lastPurchaseDealer !== 'N/A' 
                                            ? `From ${product.lastPurchaseDealer} on ${product.lastPurchaseDate}`
                                            : 'No purchase history'
                                        }
                                    </p>
                                </div>
                                <span className="text-sm font-mono text-muted-foreground ml-4">
                                    Rs. {product.costPrice.toLocaleString()}
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
          <Button>Save Sale</Button>
        </CardFooter>
      </Card>
      <CustomerDialog 
        isOpen={isCustomerDialogOpen} 
        onClose={() => setIsCustomerDialogOpen(false)}
        onSave={handleSaveNewCustomer}
        customer={null}
      />
    </div>
  );
}
