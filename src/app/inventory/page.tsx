'use client';
import type { Product } from '@/lib/data';
import { getProducts } from '@/lib/data';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
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
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ProductDialog } from './product-dialog';
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
import { useToast } from '@/hooks/use-toast';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    getProducts().then(products => {
      setProducts(products);
      setFilteredProducts(products);
    });
  }, []);

  useEffect(() => {
    const results = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.model.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(results);
  }, [searchTerm, products]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };
  
  const handleDeleteProduct = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
    toast({
        title: "Product Deleted",
        description: "The product has been removed from your inventory.",
    })
    setProductToDelete(null);
  };

  const handleSaveProduct = (product: Product) => {
    if (selectedProduct) {
      // Update existing product
      setProducts(products.map(p => p.id === product.id ? product : p));
      toast({
        title: "Success",
        description: "Product has been updated successfully.",
      })
      setIsDialogOpen(false);
    } else {
      // Add new product
      const isDuplicate = products.some(
        p => p.name.toLowerCase() === product.name.toLowerCase() &&
             p.brand.toLowerCase() === product.brand.toLowerCase() &&
             p.model.toLowerCase() === product.model.toLowerCase()
      );

      if (isDuplicate) {
        toast({
          variant: "destructive",
          title: "Failed to Add Product",
          description: "A product with the same name, brand, and model already exists.",
        });
      } else {
        setProducts([...products, { ...product, id: `PROD${Date.now()}` }]);
        toast({
            title: "Success",
            description: "Product has been added successfully.",
        });
        setIsDialogOpen(false);
      }
    }
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8">
       <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex-1">
                  <CardTitle>Inventory</CardTitle>
                  <CardDescription>
                  Manage your products from one screen.
                  </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search products..."
                    className="pl-8 sm:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddProduct}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="hidden w-[100px] sm:table-cell">
                        <span className="sr-only">Image</span>
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="hidden md:table-cell">Brand & Model</TableHead>
                        <TableHead className="text-right">Purchase Cost</TableHead>
                        <TableHead className="text-right">Sales Cost</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead>
                        <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredProducts.map((product) => (
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
                        <TableCell className="font-medium">
                          {product.name}
                           {product.stock <= product.lowStockThreshold && (
                              <Badge variant="secondary" className="ml-2">Low Stock</Badge>
                           )}
                        </TableCell>
                         <TableCell>{product.location}</TableCell>
                        <TableCell className="hidden md:table-cell">{product.brand} - {product.model}</TableCell>
                        <TableCell className="text-right">Rs. {product.costPrice.toLocaleString()}</TableCell>
                        <TableCell className="text-right">Rs. {product.salePrice.toLocaleString()}</TableCell>
                        <TableCell className="text-center">{product.stock}</TableCell>
                        <TableCell>
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
                                <DropdownMenuItem onSelect={() => handleEditProduct(product)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem 
                                  onSelect={() => setProductToDelete(product)} 
                                  className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                >
                                  Delete
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <ProductDialog 
            isOpen={isDialogOpen} 
            onClose={() => setIsDialogOpen(false)}
            onSave={handleSaveProduct}
            product={selectedProduct}
        />

        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the product
                    "{productToDelete?.name}" and remove its data from our servers.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => productToDelete && handleDeleteProduct(productToDelete.id)}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
