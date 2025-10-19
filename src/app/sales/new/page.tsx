'use client';

import { useState, useEffect } from 'react';
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
import { Trash2, PlusCircle } from 'lucide-react';
import { getProducts, type Product } from '@/lib/data';
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


interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  costPrice: number;
  isOneTime: boolean;
}

const onlinePaymentProviders = ["Easypaisa", "Jazzcash", "Meezan Bank", "Nayapay", "Sadapay", "Upaisa", "Islamic Bank"];

export default function NewSalePage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerType, setCustomerType] = useState<'walk-in' | 'registered'>(
    'walk-in'
  );
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState<'Paid' | 'Unpaid'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | null>('cash');
  const [onlinePaymentSource, setOnlinePaymentSource] = useState('');

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

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
  
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const finalAmount = subtotal - discount;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Sale</CardTitle>
          <CardDescription>
            Fill in the details to record a new transaction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <Select
                value={customerType}
                onValueChange={(val: 'walk-in' | 'registered') =>
                  setCustomerType(val)
                }
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
                {customerType === 'walk-in'
                  ? 'Customer Name'
                  : 'Search Customer'}
              </Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={
                  customerType === 'walk-in'
                    ? 'e.g., John Doe'
                    : 'Search by name or phone...'
                }
              />
            </div>
          </div>
          
          {/* Product Selection */}
          <div className="space-y-2">
            <Label>Add Products</Label>
            <div className="flex gap-2">
              <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">Search inventory...</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search for product..." />
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
                    <TableCell colSpan={5} className="text-center">
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
                      <TableCell>
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
                  <Select value={status} onValueChange={(val: 'Paid' | 'Unpaid') => {
                      setStatus(val);
                      if (val === 'Unpaid') {
                          setPaymentMethod(null);
                      } else {
                          setPaymentMethod('cash');
                      }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
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
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>Save Sale</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
