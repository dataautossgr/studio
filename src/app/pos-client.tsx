'use client';
import type { Product } from '@/lib/data';
import { useState } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Search,
  PlusCircle,
  MinusCircle,
  X,
  UserPlus,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface PosClientProps {
  products: Product[];
  categories: string[];
}

interface CartItem extends Product {
  quantity: number;
}

export function PosClient({ products, categories }: PosClientProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const filteredProducts = products.filter(
    (product) =>
      (activeCategory === 'All' || product.category === activeCategory) &&
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Card className="h-full">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Products</CardTitle>
            <div className="relative ml-auto flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <div className="border-b px-4 pb-2">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2">
                {categories.map((category) => (
                    <Button
                    key={category}
                    variant={activeCategory === category ? 'default' : 'outline'}
                    onClick={() => setActiveCategory(category)}
                    className="shrink-0"
                    >
                    {category}
                    </Button>
                ))}
                </div>
            </ScrollArea>
          </div>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer overflow-hidden transition-all hover:shadow-md"
                    onClick={() => addToCart(product)}
                  >
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={200}
                      height={200}
                      className="aspect-square w-full object-cover"
                      data-ai-hint={product.imageHint}
                    />
                    <div className="p-2">
                      <h3 className="truncate text-sm font-medium">
                        {product.name}
                      </h3>
                      <p className="text-sm font-bold text-primary">
                        Rs. {product.salePrice.toLocaleString()}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
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
