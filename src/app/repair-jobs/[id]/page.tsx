'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  Calendar as CalendarIcon,
  Save,
  Car,
  Search,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import {
  useFirestore,
  useCollection,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  getDoc,
  DocumentReference,
} from 'firebase/firestore';
import type { Customer, Product, RepairJob, RepairJobItem } from '@/lib/data';
import { CustomerDialog } from '@/app/customers/customer-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  costPrice: number;
  stock: number;
  isOneTime: boolean;
}

export default function RepairJobFormPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const jobId = params.id as string;
  const isNew = jobId === 'new';

  // Firestore collections
  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const productsCollection = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const jobRef = useMemoFirebase(() => isNew ? null : doc(firestore, 'repair_jobs', jobId), [firestore, jobId, isNew]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  const { data: jobData, isLoading: jobLoading } = useDoc<RepairJob>(jobRef);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [createdAt, setCreatedAt] = useState<Date>(new Date());
  const [items, setItems] = useState<BillItem[]>([]);
  const [status, setStatus] = useState<RepairJob['status']>('In Progress');

  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

  // Effect to populate form when editing an existing job
  useEffect(() => {
    if (jobData && customers) {
        const fetchCustomer = async () => {
            if (jobData.customer instanceof DocumentReference) {
                const customerSnap = await getDoc(jobData.customer);
                if (customerSnap.exists()) {
                    setSelectedCustomer({ id: customerSnap.id, ...customerSnap.data() } as Customer);
                }
            }
        }
        fetchCustomer();
        setVehicleInfo(jobData.vehicleInfo);
        setCreatedAt(new Date(jobData.createdAt));
        setStatus(jobData.status);
         if (jobData.items && products) {
            const billItems: BillItem[] = jobData.items.map(item => {
                const product = products.find(p => p.id === item.productId);
                return {
                    id: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    costPrice: product?.costPrice || 0,
                    stock: product?.stock || 0,
                    isOneTime: !product,
                };
            });
            setItems(billItems);
        }
    }
  }, [jobData, customers, products]);

  const totalAmount = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [items]);

   const handleProductSelect = (product: Product) => {
    const existingItem = items.find((item) => item.id === product.id);
    if (existingItem) {
      setItems(
        items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setItems([
        ...items,
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
    setItems([
      ...items,
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
  
  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };
  
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };


  const handleSaveJob = async () => {
    if (!selectedCustomer || !vehicleInfo) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a customer and enter vehicle info.',
      });
      return;
    }

    const batch = writeBatch(firestore);
    
    const jobPayload: Omit<RepairJob, 'id' | 'jobId'> = {
      customer: doc(firestore, 'customers', selectedCustomer.id),
      vehicleInfo,
      status: status,
      createdAt: createdAt.toISOString(),
      total: totalAmount,
      mechanic: '', // Simplified
      items: items.map(i => ({
          productId: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
      })),
    };

    if (isNew) {
      const newJobRef = doc(collection(firestore, 'repair_jobs'));
      const newJobId = `JOB-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      batch.set(newJobRef, { ...jobPayload, jobId: newJobId });
      toast({ title: 'Temporary Bill Created', description: `Bill ${newJobId} has been created.` });
      router.push(`/repair-jobs/${newJobRef.id}`);
    } else {
      batch.update(jobRef!, jobPayload);
      toast({ title: 'Temporary Bill Updated', description: `Bill ${jobData?.jobId} has been updated.` });
    }

    try {
        await batch.commit();
    } catch (error) {
        console.error("Error saving job:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save the bill." });
    }
  };
  
  const isLoading = customersLoading || jobLoading || productsLoading;
  const pageTitle = isNew ? 'Create New Temporary Bill' : `Edit Bill - ${jobData?.jobId || ''}`;


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            {isNew ? 'Add products to a new temporary bill.' : 'Update the products and details for this bill.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {isLoading ? (
                <div className="space-y-8">
                    <div className="h-10 w-1/2 bg-muted rounded-md animate-pulse" />
                    <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
                </div>
            ) : (
                <>
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Customer Selection */}
                    <div className="space-y-2">
                        <Label>Customer</Label>
                        <div className="flex gap-2">
                        <Select
                            value={selectedCustomer?.id || ''}
                            onValueChange={(customerId) => {
                            const customer = customers?.find(c => c.id === customerId);
                            setSelectedCustomer(customer || null);
                            if (customer) setVehicleInfo(customer.vehicleDetails);
                            }}
                        >
                            <SelectTrigger>
                            <SelectValue placeholder="Select a registered customer" />
                            </SelectTrigger>
                            <SelectContent>
                            {customers?.filter(c=>c.type==='registered').map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} ({customer.phone})
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => setIsCustomerDialogOpen(true)}>
                            <UserPlus className="h-4 w-4" />
                        </Button>
                        </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="space-y-2">
                        <Label htmlFor="vehicleInfo">Vehicle Info (Model, Reg #)</Label>
                        <div className="relative">
                            <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input id="vehicleInfo" value={vehicleInfo} onChange={(e) => setVehicleInfo(e.target.value)} placeholder="e.g., Corolla GLI, LEB-21-5555" className="pl-10" />
                        </div>
                    </div>

                    {/* Job Date */}
                    <div className="space-y-2">
                        <Label>Date</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={'outline'}
                            className={cn('w-full justify-start text-left font-normal', !createdAt && 'text-muted-foreground')}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {createdAt ? format(createdAt, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={createdAt} onSelect={(d) => setCreatedAt(d || new Date())} initialFocus />
                        </PopoverContent>
                        </Popover>
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
                                    <CommandInput placeholder="Search for product..." />
                                    <CommandList>
                                        <CommandEmpty>No products found.</CommandEmpty>
                                        <CommandGroup>
                                        {products?.map((product) => (
                                            <CommandItem key={product.id} onSelect={() => handleProductSelect(product)} >
                                                <div className="flex w-full justify-between items-center">
                                                    <span>{product.name} ({product.brand})</span>
                                                    <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
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

                 <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="w-1/2">Product</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Sale Price</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No products added to this bill.
                                </TableCell>
                            </TableRow>
                            ) : (
                            items.map((item) => (
                                <TableRow key={item.id}>
                                <TableCell>
                                    {item.isOneTime ? (
                                    <Input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="Enter product name"/>
                                    ) : (
                                    <span className="font-medium">{item.name}</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-20" min="1"/>
                                </TableCell>
                                <TableCell>
                                    <Input type="number" value={item.price} onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} className="w-24" min="0"/>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    Rs. {(item.quantity * item.price).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                                </TableRow>
                            ))
                            )}
                        </TableBody>
                         <TableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold text-lg">Total Amount</TableCell>
                                <TableCell className="text-right font-bold font-mono text-lg">Rs. {totalAmount.toLocaleString()}</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
                </>
            )}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
             <div className="flex items-center gap-4">
                <Label htmlFor="status">Status</Label>
                 <Select value={status} onValueChange={(value: RepairJob['status']) => setStatus(value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Paused">Paused</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className='flex gap-2'>
                <Button variant="outline" onClick={() => router.push('/repair-jobs')}>Cancel</Button>
                 <Button onClick={handleSaveJob} disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isNew ? 'Create Bill' : 'Save Changes'}
                </Button>
                <Button disabled>Finalize & Bill</Button>
            </div>
        </CardFooter>
      </Card>
      
      <CustomerDialog 
        isOpen={isCustomerDialogOpen} 
        onClose={() => setIsCustomerDialogOpen(false)}
        onSave={() => { /* Implement save logic here if needed */ }}
        customer={null}
      />
    </div>
  );
}
