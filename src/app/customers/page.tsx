
'use client';
import { type Customer } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, PlusCircle, Trash2, Eye, RotateCcw, Download, Users } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { CustomerDialog } from './customer-dialog';
import { useToast } from '@/hooks/use-toast';
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
import { useCollection, useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type CustomerType = 'automotive' | 'battery';

export default function CustomersPage() {
  const firestore = useFirestore();
  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const { data: customers, isLoading } = useCollection<Customer>(customersCollection);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [dialogCustomerType, setDialogCustomerType] = useState<CustomerType>('automotive');

  const { toast } = useToast();

  const totalDues = useMemo(() => {
    if (!customers) return { automotive: 0, battery: 0 };
    return customers.reduce((acc, customer) => {
        if (customer.balance > 0) {
            acc[customer.type] += customer.balance;
        }
        return acc;
    }, { automotive: 0, battery: 0 });
  }, [customers]);
  
  const handleAddCustomer = (type: CustomerType) => {
    setSelectedCustomer(null);
    setDialogCustomerType(type);
    setIsDialogOpen(true);
  };
  
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogCustomerType(customer.type);
    setIsDialogOpen(true);
  };

  const handleSaveCustomer = (customerData: Omit<Customer, 'id' | 'balance' | 'type'>, type: CustomerType) => {
    if (!firestore) return;
    if (selectedCustomer) {
      const customerRef = doc(firestore, 'customers', selectedCustomer.id);
      setDocumentNonBlocking(customerRef, { ...selectedCustomer, ...customerData, type }, { merge: true });
      toast({ title: "Success", description: "Customer updated successfully." });
    } else {
      const newCustomer: Omit<Customer, 'id'> = { 
        ...customerData, 
        balance: 0,
        type: type,
      };
      addDocumentNonBlocking(collection(firestore, 'customers'), newCustomer);
      toast({ title: "Success", description: "Customer added successfully." });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteCustomer = () => {
    if (!customerToDelete || !firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'customers', customerToDelete.id));
    toast({ title: "Customer Deleted", description: "The customer has been removed." });
    setCustomerToDelete(null);
  };

  const handleReset = () => {
    toast({
        title: 'Coming Soon',
        description: 'This feature is not yet implemented.',
        variant: 'destructive',
    });
    setIsResetting(false);
  };

  const handleExport = (type: CustomerType) => {
    const filteredCustomers = customers?.filter(c => c.type === type);
    if (!filteredCustomers || filteredCustomers.length === 0) {
        toast({ variant: 'destructive', title: 'Export Failed', description: `No ${type} customers to export.` });
        return;
    }
    const headers = ['ID', 'Name', 'Phone', 'Vehicle Details', 'Address', 'Balance'];
    const csvContent = [
        headers.join(','),
        ...filteredCustomers.map(c => [
            c.id,
            `"${c.name.replace(/"/g, '""')}"`,
            c.phone,
            `"${c.vehicleDetails.replace(/"/g, '""')}"`,
            `"${(c.address || '').replace(/"/g, '""')}"`,
            c.balance
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers-${type}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: `Your ${type} customers list has been downloaded.` });
  };

  const getBalanceVariant = (balance: number): "default" | "secondary" | "destructive" => {
    if (balance > 0) return 'destructive'; // Customer owes us
    if (balance < 0) return 'secondary'; // We owe customer (advance)
    return 'default';
  }

  const renderCustomerTable = (type: CustomerType) => (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>All {type.charAt(0).toUpperCase() + type.slice(1)} Customers</CardTitle>
          <CardDescription>
            Manage your {type} customers.
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleExport(type)}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
                <Button onClick={() => handleAddCustomer(type)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add {type.charAt(0).toUpperCase() + type.slice(1)} Customer
                </Button>
            </div>
            <Card className="p-4 w-fit">
                <p className="text-sm font-medium text-muted-foreground">Total Dues Receivable</p>
                <p className="text-2xl font-bold text-destructive">Rs. {(totalDues[type] || 0).toLocaleString()}</p>
            </Card>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Number</TableHead>
              <TableHead>Vehicle Details</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            )}
            {customers?.filter(c => c.type === type).map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.vehicleDetails}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={getBalanceVariant(customer.balance)} className="font-mono">
                    Rs. {Math.abs(customer.balance).toLocaleString()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
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
                      <DropdownMenuItem asChild>
                          <Link href={`/customers/${customer.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Ledger
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleEditCustomer(customer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                          onSelect={() => setCustomerToDelete(customer)}
                          className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                      >
                          <Trash2 className="mr-2 h-4 w-4" />
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
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
       <Tabs defaultValue="automotive" className="w-full">
         <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                <p className="text-muted-foreground">
                    Manage your customer base for different business types.
                </p>
            </div>
             <div className="flex items-center gap-4">
                <TabsList>
                    <TabsTrigger value="automotive">Automotive</TabsTrigger>
                    <TabsTrigger value="battery">Battery</TabsTrigger>
                </TabsList>
                <Button variant="outline" onClick={() => setIsResetting(true)}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Reset All
                </Button>
            </div>
        </div>
        <TabsContent value="automotive">
          {renderCustomerTable('automotive')}
        </TabsContent>
        <TabsContent value="battery">
          {renderCustomerTable('battery')}
        </TabsContent>
      </Tabs>

       <CustomerDialog 
            isOpen={isDialogOpen} 
            onClose={() => setIsDialogOpen(false)}
            onSave={(data) => handleSaveCustomer(data, dialogCustomerType)}
            customer={selectedCustomer}
            type={dialogCustomerType}
        />
        
        <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the customer "{customerToDelete?.name}" and all their associated data. This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCustomer}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isResetting} onOpenChange={setIsResetting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to reset?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will reset the entire customer list to its original state. Any changes you've made will be lost. This will not affect your cloud backup.
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
