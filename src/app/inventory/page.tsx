'use client';
import type { Product } from '@/lib/data';
import { getProducts, getProductCategories } from '@/lib/data';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  PlusCircle,
  MinusCircle,
  UserPlus,
  Plus,
  ShoppingCart
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CartItem extends Product {
  quantity: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);
  
  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prevCart) => {
      if (quantity === 0) {
        return prevCart.filter((item) => item.id !== productId);
      }
      return prevCart.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
    });
  };
  
  const subtotal = cart.reduce(
    (acc, item) => acc + item.salePrice * item.quantity,
    0
  );
  const discount = 0; // Placeholder for discount logic
  const total = subtotal - discount;

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-1 gap-4 p-4 lg:grid-cols-3">
       <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Inventory & POS</CardTitle>
                <CardDescription>
                Manage your products and create sales from one screen.
                </CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Product
            </Button>
            </CardHeader>
            <CardContent className="flex-grow p-0">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="hidden w-[100px] sm:table-cell">
                            <span className="sr-only">Image</span>
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="hidden md:table-cell">
                            Stock
                            </TableHead>
                            <TableHead>
                            <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {products.map((product) => (
                            <TableRow key={product.id}>
                            <TableCell className="hidden sm:table-cell">
                                <Image
                                alt={product.name}
                                className="aspect-square rounded-md object-cover"
                                height="64"
                                src={product.imageUrl}
                                width="64"
                                data-ai-hint={product.imageHint}
                                />
                            </TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                                <Badge variant={product.stock > 0 ? (product.stock > product.lowStockThreshold ? 'default' : 'secondary') : 'destructive'}>
                                {product.stock > 0 ? (product.stock > product.lowStockThreshold ? 'In Stock' : 'Low Stock') : 'Out of Stock'}
                                </Badge>
                            </TableCell>
                            <TableCell>Rs. {product.salePrice.toLocaleString()}</TableCell>
                            <TableCell className="hidden md:table-cell">
                                {product.stock}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => addToCart(product)}>
                                    <ShoppingCart className="h-4 w-4" />
                                    <span className="sr-only">Add to Cart</span>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button
                                        aria-haspopup="true"
                                        size="icon"
                                        variant="ghost"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Toggle menu</span>
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                    <DropdownMenuItem>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                </div>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Current Order
              <Button variant="ghost" size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow p-0">
            <ScrollArea className="h-[calc(100vh-22rem)]">
              {cart.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <p>Cart is empty</p>
                </div>
              ) : (
                <div className="divide-y p-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-4">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="aspect-square rounded-md object-cover"
                        data-ai-hint={item.imageHint}
                      />
                      <div className="flex-grow">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Rs. {item.salePrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                        <span>{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="font-semibold">
                        Rs. {(item.salePrice * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 bg-muted/50 p-4">
            <div className="flex w-full justify-between">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex w-full justify-between">
              <span>Discount</span>
              <span className="text-destructive">
                -Rs. {discount.toLocaleString()}
              </span>
            </div>
            <Separator />
            <div className="flex w-full justify-between text-lg font-bold">
              <span>Total</span>
              <span>Rs. {total.toLocaleString()}</span>
            </div>
            <Button size="lg" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Sale
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
