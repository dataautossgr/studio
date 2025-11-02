
'use client';
import type { Product, Purchase, Dealer } from '@/lib/data';
import { seedInitialData } from '@/lib/data';
import { useState, useEffect, useMemo } from 'react';
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
  Search,
  RotateCcw,
  Download,
  DollarSign,
  Package,
  Boxes,
  Archive,
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
import { format } from 'date-fns';
import { useCollection, useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';


interface DisplayProduct extends Product {
    lastPurchaseDate?: string;
    lastPurchaseDealer?: string;
}

export default function InventoryPage() {
  const firestore = useFirestore();
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const purchasesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'purchases') : null, [firestore]);
  const dealersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'dealers') : null, [firestore]);

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection);
  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<Purchase>(purchasesCollection);
  const { data: dealers, isLoading: isLoadingDealers } = useCollection<Dealer>(dealersCollection);

  const [filteredProducts, setFilteredProducts] = useState<DisplayProduct[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const { totalSaleValue, totalCostValue, totalUniqueProducts, totalStockQuantity } = useMemo(() => {
    if (!products) return { totalSaleValue: 0, totalCostValue: 0, totalUniqueProducts: 0, totalStockQuantity: 0 };
    
    const totalCostValue = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
    const totalSaleValue = products.reduce((acc, p) => acc + (p.salePrice * p.stock), 0);
    const totalUniqueProducts = products.length;
    const totalStockQuantity = products.reduce((acc, p) => acc + p.stock, 0);

    return { totalSaleValue, totalCostValue, totalUniqueProducts, totalStockQuantity };
  }, [products]);

  const displayProducts = useMemo(() => {
    if (!products || !purchases || !dealers) return [];
    return products.map(product => {
        const productPurchases = purchases
            .filter(p => p.items.some(item => item.productId === product.id))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const lastPurchase = productPurchases[0];
        const dealer = lastPurchase ? dealers.find(d => d.id === lastPurchase.dealer.id) : null;
        
        return {
            ...product,
            lastPurchaseDate: lastPurchase ? format(new Date(lastPurchase.date), 'dd MMM, yyyy') : 'N/A',
            lastPurchaseDealer: dealer ? dealer.company : (product.dealerId ? 'N/A' : 'N/A'),
        }
    })
  }, [products, purchases, dealers]);

  useEffect(() => {
    const results = displayProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.model && product.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.lastPurchaseDealer && product.lastPurchaseDealer.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredProducts(results);
  }, [searchTerm, displayProducts]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };
  
  const handleDeleteProduct = () => {
    if(!productToDelete || !firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'products', productToDelete.id));
    toast({
        title: "Product Deleted",
        description: "The product has been removed from your inventory.",
    })
    setProductToDelete(null);
  };

  const handleSaveProduct = (product: Omit<Product, 'id'>) => {
    if (!firestore) return;
    if (selectedProduct) {
      // Update existing product
      const productRef = doc(firestore, 'products', selectedProduct.id);
      setDocumentNonBlocking(productRef, { ...selectedProduct, ...product }, { merge: true });
      toast({
        title: "Success",
        description: "Product has been updated successfully.",
      })
    } else {
      // Add new product
      const isDuplicate = products?.some(
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
         return;
      }
      
      addDocumentNonBlocking(collection(firestore, 'products'), product);
      toast({
          title: "Success",
          description: "Product has been added successfully.",
      });
    }
    setIsDialogOpen(false);
  };

  const handleReset = async () => {
    if (!firestore) return;
    await seedInitialData(firestore);
    toast({ title: "Inventory Reset", description: "The inventory list has been reset to its initial state." });
    setIsResetting(false);
  };

  const handleExport = () => {
    if (!products) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'No product data to export.' });
        return;
    }
    const headers = ['ID', 'Name', 'Category', 'Brand', 'Model', 'Cost Price', 'Sale Price', 'Stock', 'Unit', 'Low Stock Threshold', 'Location'];
    const csvContent = [
        headers.join(','),
        ...products.map(p => [
            p.id,
            `"${p.name.replace(/"/g, '""')}"`,
            `"${p.category.replace(/"/g, '""')}"`,
            `"${p.brand.replace(/"/g, '""')}"`,
            `"${p.model.replace(/"/g, '""')}"`,
            p.costPrice,
            p.salePrice,
            p.stock,
            p.unit,
            p.lowStockThreshold,
            `"${(p.location || '').replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: 'Your inventory data has been downloaded as a CSV file.' });
  };
  
  const isLoading = isLoadingProducts || isLoadingPurchases || isLoadingDealers;

  const inventoryStats = [
    { title: "Total Stock Value (Sale)", value: `Rs. ${totalSaleValue.toLocaleString()}`, icon: DollarSign },
    { title: "Total Stock Value (Cost)", value: `Rs. ${totalCostValue.toLocaleString()}`, icon: Archive },
    { title: "Unique Products", value: totalUniqueProducts.toLocaleString(), icon: Boxes },
    { title: "Total Items in Stock", value: totalStockQuantity.toLocaleString(), icon: Package },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? Array.from({length: 4}).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 w-2/3 bg-muted rounded-md animate-pulse" />
                    </CardHeader>
                    <CardContent>
                    <div className="h-8 w-1/2 bg-muted rounded-md animate-pulse" />
                    </CardContent>
                </Card>
            )) : inventoryStats.map((stat, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>

       <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex-1">
                  <CardTitle>Inventory</CardTitle>
                  <CardDescription>
                  Manage your products from one screen.
                  </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search products..."
                    className="pl-8 sm:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
                <Button variant="outline" onClick={() => setIsResetting(true)}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
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
                        <TableHead>Dealer</TableHead>
                        <TableHead>Last Purchase</TableHead>
                        <TableHead className="text-right">Purchase Cost</TableHead>
                        <TableHead className="text-right">Sales Cost</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead>
                        <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading && (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center">Loading inventory...</TableCell>
                        </TableRow>
                    )}
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
                              <Badge variant="destructive" className="ml-2">Low Stock</Badge>
                           )}
                        </TableCell>
                         <TableCell>{product.location}</TableCell>
                         <TableCell className="hidden md:table-cell">{product.lastPurchaseDealer}</TableCell>
                         <TableCell className="hidden md:table-cell">{product.lastPurchaseDate}</TableCell>
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
                <AlertDialogAction onClick={handleDeleteProduct}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isResetting} onOpenChange={setIsResetting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to reset?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will reset the inventory list to its original state. Any changes you've made will be lost.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Reset Data</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
