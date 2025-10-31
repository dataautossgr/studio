
'use client';
import { getCustomers, type Customer, seedInitialData } from '@/lib/data';
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
import { MoreHorizontal, Pencil, PlusCircle, Trash2, Eye, RotateCcw, Download } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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


export default function CustomersPage() {
  const firestore = useFirestore();
  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const { data: customers, isLoading } = useCollection<Customer>(customersCollection);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  
  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsDialogOpen(true);
  };
  
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleSaveCustomer = (customerData: Omit<Customer, 'id' | 'balance' | 'type'>) => {
    if (selectedCustomer) {
      const customerRef = doc(firestore, 'customers', selectedCustomer.id);
      setDocumentNonBlocking(customerRef, { ...selectedCustomer, ...customerData }, { merge: true });
      toast({ title: "Success", description: "Customer updated successfully." });
    } else {
      const newCustomer: Omit<Customer, 'id'> = { 
        ...customerData, 
        balance: 0,
        type: 'registered'
      };
      addDocumentNonBlocking(collection(firestore, 'customers'), newCustomer);
      toast({ title: "Success", description: "Customer added successfully." });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'customers', customerToDelete.id));
    toast({ title: "Customer Deleted", description: "The customer has been removed." });
    setCustomerToDelete(null);
  };

  const handleReset = async () => {
    await seedInitialData(firestore);
    toast({ title: "Customers Reset", description: "The customer list has been reset to its initial state." });
    setIsResetting(false);
  }

  const handleExport = () => {
    const registeredCustomers = customers?.filter(c => c.type === 'registered');
    if (!registeredCustomers || registeredCustomers.length === 0) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'No registered customers to export.' });
        return;
    }
    const headers = ['ID', 'Name', 'Phone', 'Vehicle Details', 'Address', 'Balance'];
    const csvContent = [
        headers.join(','),
        ...registeredCustomers.map(c => [
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
    link.setAttribute('download', `customers-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: 'Your customers list has been downloaded as a CSV file.' });
  };

  const getBalanceVariant = (balance: number): "default" | "secondary" | "destructive" => {
    if (balance > 0) return 'destructive'; // Customer owes us
    if (balance < 0) return 'secondary'; // We owe customer (advance)
    return 'default';
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Customers</CardTitle>
            <CardDescription>
              Manage your registered customers.
            </CardDescription>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => setIsResetting(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button onClick={handleAddCustomer}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
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
              {customers?.filter(c => c.type === 'registered').map((customer) => (
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

       <CustomerDialog 
            isOpen={isDialogOpen} 
            onClose={() => setIsDialogOpen(false)}
            onSave={handleSaveCustomer}
            customer={selectedCustomer}
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
                    This will reset the customer list to its original state. Any changes you've made will be lost. This will not affect your cloud backup.
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
