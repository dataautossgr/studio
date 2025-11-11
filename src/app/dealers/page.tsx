
'use client';
import { type Dealer } from '@/lib/data';
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
import { useState, useMemo } from 'react';
import { DealerDialog } from './dealer-dialog';
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
} from "@/components/ui/alert-dialog";
import { useCollection, useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DealerType = 'automotive' | 'battery';

export default function DealersPage() {
  const firestore = useFirestore();
  const dealersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'dealers') : null, [firestore]);
  const { data: dealers, isLoading } = useCollection<Dealer>(dealersCollection);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [dealerToDelete, setDealerToDelete] = useState<Dealer | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [dialogDealerType, setDialogDealerType] = useState<DealerType>('automotive');
  const { toast } = useToast();
  
  const totalDues = useMemo(() => {
    if (!dealers) return { automotive: 0, battery: 0 };
    return dealers.reduce((acc, dealer) => {
        if (dealer.balance > 0) {
            acc[dealer.type] += dealer.balance;
        }
        return acc;
    }, { automotive: 0, battery: 0 });
  }, [dealers]);
  
  const handleAddDealer = (type: DealerType) => {
    setSelectedDealer(null);
    setDialogDealerType(type);
    setIsDialogOpen(true);
  };
  
  const handleEditDealer = (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setDialogDealerType(dealer.type);
    setIsDialogOpen(true);
  };

  const handleSaveDealer = (dealerData: Omit<Dealer, 'id' | 'balance' | 'type'>, type: DealerType) => {
    if (!firestore) return;
    if (selectedDealer) {
      const dealerRef = doc(firestore, 'dealers', selectedDealer.id);
      setDocumentNonBlocking(dealerRef, { ...selectedDealer, ...dealerData, type }, { merge: true });
      toast({ title: "Success", description: "Dealer updated successfully." });
    } else {
      const newDealer = { ...dealerData, balance: 0, type };
      addDocumentNonBlocking(collection(firestore, 'dealers'), newDealer);
      toast({ title: "Success", description: "Dealer added successfully." });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteDealer = () => {
    if(!dealerToDelete || !firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'dealers', dealerToDelete.id));
    toast({ title: "Dealer Deleted", description: "The dealer has been removed." });
    setDealerToDelete(null);
  };

  const handleReset = async () => {
    toast({
        title: 'Coming Soon',
        description: 'This feature is not yet implemented.',
        variant: 'destructive',
    });
    setIsResetting(false);
  };

  const handleExport = (type: DealerType) => {
    const filteredDealers = dealers?.filter(d => d.type === type);
    if (!filteredDealers || filteredDealers.length === 0) {
        toast({ variant: 'destructive', title: 'Export Failed', description: `No ${type} dealers to export.` });
        return;
    }
    const headers = ['ID', 'Company', 'Contact Person', 'Phone', 'Address', 'Balance'];
    const csvContent = [
        headers.join(','),
        ...filteredDealers.map(d => [
            d.id,
            `"${d.company.replace(/"/g, '""')}"`,
            `"${d.name.replace(/"/g, '""')}"`,
            d.phone,
            `"${(d.address || '').replace(/"/g, '""')}"`,
            d.balance
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dealers-${type}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: `Your ${type} dealers list has been downloaded.` });
  };

  const getBalanceVariant = (balance: number): "default" | "secondary" | "destructive" => {
    if (balance > 0) return 'destructive'; // We owe the dealer
    if (balance < 0) return 'secondary'; // Dealer owes us (advance)
    return 'default';
  }

  const renderDealerTable = (type: DealerType) => (
     <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>All {type.charAt(0).toUpperCase() + type.slice(1)} Dealers</CardTitle>
            <CardDescription>
              Manage your suppliers for {type} products.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleExport(type)}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
                <Button onClick={() => handleAddDealer(type)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add {type.charAt(0).toUpperCase() + type.slice(1)} Dealer
                </Button>
            </div>
             <Card className="p-4 w-fit">
                <p className="text-sm font-medium text-muted-foreground">Total Dues Payable</p>
                <p className="text-2xl font-bold text-destructive">Rs. {(totalDues[type] || 0).toLocaleString()}</p>
            </Card>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Contact Number</TableHead>
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
              {dealers?.filter(d => d.type === type).map((dealer) => (
                <TableRow key={dealer.id}>
                  <TableCell className="font-medium">{dealer.company}</TableCell>
                  <TableCell>{dealer.name}</TableCell>
                  <TableCell>{dealer.phone}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getBalanceVariant(dealer.balance)} className="font-mono">
                      Rs. {Math.abs(dealer.balance).toLocaleString()}
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
                            <Link href={`/dealers/${dealer.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Ledger
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleEditDealer(dealer)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onSelect={() => setDealerToDelete(dealer)}
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
                    <h1 className="text-3xl font-bold tracking-tight">Dealers</h1>
                    <p className="text-muted-foreground">
                        Manage your suppliers for different business types.
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
                {renderDealerTable('automotive')}
            </TabsContent>
            <TabsContent value="battery">
                {renderDealerTable('battery')}
            </TabsContent>
        </Tabs>
        
       <DealerDialog 
            isOpen={isDialogOpen} 
            onClose={() => setIsDialogOpen(false)}
            onSave={(data) => handleSaveDealer(data, dialogDealerType)}
            dealer={selectedDealer}
            type={dialogDealerType}
        />
        
        <AlertDialog open={!!dealerToDelete} onOpenChange={() => setDealerToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the dealer "{dealerToDelete?.company}" and all their associated data. This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteDealer}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isResetting} onOpenChange={setIsResetting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to reset?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will reset the dealer list to its original state. Any changes you've made will be lost. This will not affect your cloud backup.
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
