
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  User,
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
  writeBatch,
  getDoc,
  DocumentReference,
  getCountFromServer,
} from 'firebase/firestore';
import type { Customer, Product, RepairJob, Sale } from '@/lib/data';
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
  TableFooter
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

interface RepairJobFormDetailProps {
    jobId?: string;
}

export default function RepairJobFormDetail({ jobId }: RepairJobFormDetailProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const isNew = !jobId || jobId === 'new';

  // Firestore collections
  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const jobRef = useMemoFirebase(() => isNew || !firestore ? null : doc(firestore, 'repair_jobs', jobId!), [firestore, jobId, isNew]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  const { data: jobData, isLoading: jobLoading } = useDoc<RepairJob>(jobRef);
  
  const automotiveCustomers = useMemo(() => customers?.filter(c => c.type === 'automotive') || [], [customers]);


  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [mechanic, setMechanic] = useState('');
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [status, setStatus] = useState<RepairJob['status']>('In Progress');

  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

  // Effect to set initial date on client to avoid hydration mismatch
  useEffect(() => {
    if (isNew) {
      setCreatedAt(new Date());
    }
  }, [isNew]);

  // Effect to populate form when editing an existing job
  useEffect(() => {
    if (jobData && !jobLoading && products && customers) {
      const fetchAndSetData = async () => {
        if (jobData.customer instanceof DocumentReference) {
          const customerSnap = await getDoc(jobData.customer);
          if (customerSnap.exists()) {
            setSelectedCustomer({ id: customerSnap.id, ...customerSnap.data() } as Customer);
          }
        }
        setVehicleInfo(jobData.vehicleInfo);
        setMechanic(jobData.mechanic || '');
        setCreatedAt(new Date(jobData.createdAt));
        setStatus(jobData.status);

        if (jobData.items) {
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
      };
      fetchAndSetData();
    }
  }, [jobData, jobLoading, customers, products]);

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
    if (!firestore || !selectedCustomer || !vehicleInfo || !createdAt) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a customer, enter vehicle info, and ensure a date is set.',
      });
      return;
    }

    const batch = writeBatch(firestore);
    
    const jobPayload: Omit<RepairJob, 'id' | 'jobId'> = {
      customer: doc(firestore, 'customers', selectedCustomer.id),
      vehicleInfo,
      mechanic,
      status: status,
      createdAt: createdAt.toISOString(),
      total: totalAmount,
      items: items.map(i => ({
          productId: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
      })),
      ...( (status === 'Completed' || status === 'Cancelled') && { closedAt: new Date().toISOString() })
    };
    
    if (isNew) {
      const newJobRef = doc(collection(firestore, 'repair_jobs'));
      const newJobId = `JOB-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      batch.set(newJobRef, { ...jobPayload, jobId: newJobId });
      toast({ title: 'Temporary Bill Created', description: `Bill ${newJobId} has been created.` });
      router.push(`/repair-jobs/${newJobRef.id}`);
    } else {
      if (!jobRef) return;
      batch.update(jobRef, jobPayload as any); // Use `as any` to bypass strict type checking for partial updates
      toast({ title: 'Temporary Bill Updated', description: `Bill ${jobData?.jobId} has been updated.` });
    }

    try {
        await batch.commit();
    } catch (error) {
        console.error("Error saving job:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save the bill." });
    }
  };

  const handleFinalizeAndBill = async () => {
    if (!firestore || !selectedCustomer || items.length === 0 || !jobRef) {
        toast({
            variant: "destructive",
            title: "Cannot Finalize",
            description: "A customer must be selected and the bill cannot be empty."
        });
        return;
    }

    const batch = writeBatch(firestore);
    
    // Get next invoice number
    const salesCollectionRef = collection(firestore, 'sales');
    const salesSnapshot = await getCountFromServer(salesCollectionRef);
    const newInvoiceNumber = (salesSnapshot.data().count + 1).toString().padStart(3, '0');


    // 1. Create a new Sale document
    const newSaleRef = doc(collection(firestore, 'sales'));
    const newSale: Omit<Sale, 'id'> = {
        invoice: `INV-${newInvoiceNumber}`,
        customer: doc(firestore, 'customers', selectedCustomer.id),
        date: new Date().toISOString(),
        total: totalAmount,
        status: 'Unpaid', // Default to Unpaid, can be changed in the sales screen
        items: items.map(i => ({
            productId: i.id,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
        })),
    };
    batch.set(newSaleRef, newSale);

    // 2. Update customer balance
    batch.update(doc(firestore, 'customers', selectedCustomer.id), {
        balance: (selectedCustomer.balance || 0) + totalAmount
    });

    // 3. Update product stock for non-one-time items
    items.forEach(item => {
        if (!item.isOneTime) {
            const productRef = doc(firestore, 'products', item.id);
            batch.update(productRef, { stock: item.stock - item.quantity });
        }
    });

    // 4. Update the repair job status to 'Completed'
    batch.update(jobRef, { status: 'Completed', closedAt: new Date().toISOString() });

    try {
        await batch.commit();
        toast({
            title: "Bill Finalized!",
            description: `Temporary bill ${jobData?.jobId} has been converted to Sale ${newSale.invoice}.`
        });
        router.push(`/sales/${newSaleRef.id}`);
    } catch (error) {
        console.error("Error finalizing bill:", error);
        toast({ variant: "destructive", title: "Finalization Failed", description: "Could not finalize the bill." });
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Customer Selection */}
                    <div className="space-y-2">
                        <Label>Customer</Label>
                        <div className="flex gap-2">
                        <Select
                            value={selectedCustomer?.id || ''}
                            onValueChange={(customerId) => {
                            const customer = automotiveCustomers?.find(c => c.id === customerId);
                            setSelectedCustomer(customer || null);
                            if (customer) setVehicleInfo(customer.vehicleDetails);
                            }}
                        >
                            <SelectTrigger>
                            <SelectValue placeholder="Select a registered customer" />
                            </SelectTrigger>
                            <SelectContent>
                            {automotiveCustomers?.map((customer) => (
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
                     {/* Mechanic Name */}
                    <div className="space-y-2">
                        <Label htmlFor="mechanic">Mechanic Name (Optional)</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input id="mechanic" value={mechanic} onChange={(e) => setMechanic(e.target.value)} placeholder="e.g., Akram Ustaad" className="pl-10" />
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
                            <Calendar mode="single" selected={createdAt || undefined} onSelect={(d) => setCreatedAt(d || new Date())} initialFocus />
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
                                            <CommandItem key={product.id} onSelect={() => {
                                                handleProductSelect(product)
                                                document.body.click()
                                            }} >
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
                            <TableHead className="text-right">Total</TableHead>
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
                                <TableCell className='text-right'>
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
                <Button onClick={handleFinalizeAndBill} disabled={isNew || isLoading}>Finalize & Bill</Button>
            </div>
        </CardFooter>
      </Card>
      
      <CustomerDialog 
        isOpen={isCustomerDialogOpen} 
        onClose={() => setIsCustomerDialogOpen(false)}
        onSave={() => { /* Implement save logic here if needed */ }}
        customer={null}
        type="automotive"
      />
    </div>
  );
}
