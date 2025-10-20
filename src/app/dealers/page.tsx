'use client';
import { getDealers, type Dealer, seedInitialData } from '@/lib/data';
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
import { MoreHorizontal, Pencil, PlusCircle, Trash2, Eye, RotateCcw } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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


export default function DealersPage() {
  const firestore = useFirestore();
  const dealersCollection = useMemoFirebase(() => collection(firestore, 'dealers'), [firestore]);
  const { data: dealers, isLoading } = useCollection<Dealer>(dealersCollection);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [dealerToDelete, setDealerToDelete] = useState<Dealer | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  
  const handleAddDealer = () => {
    setSelectedDealer(null);
    setIsDialogOpen(true);
  };
  
  const handleEditDealer = (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setIsDialogOpen(true);
  };

  const handleSaveDealer = (dealer: Omit<Dealer, 'id' | 'balance'>) => {
    if (selectedDealer) {
      const dealerRef = doc(firestore, 'dealers', selectedDealer.id);
      setDocumentNonBlocking(dealerRef, { ...selectedDealer, ...dealer }, { merge: true });
      toast({ title: "Success", description: "Dealer updated successfully." });
    } else {
      const newDealer = { ...dealer, balance: 0 };
      addDocumentNonBlocking(collection(firestore, 'dealers'), newDealer);
      toast({ title: "Success", description: "Dealer added successfully." });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteDealer = () => {
    if(!dealerToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'dealers', dealerToDelete.id));
    toast({ title: "Dealer Deleted", description: "The dealer has been removed." });
    setDealerToDelete(null);
  };

  const handleReset = async () => {
    await seedInitialData(firestore);
    toast({ title: "Dealers Reset", description: "The dealer list has been reset to its initial state." });
    setIsResetting(false);
  };

  const getBalanceVariant = (balance: number): "default" | "secondary" | "destructive" => {
    if (balance > 0) return 'destructive'; // We owe the dealer
    if (balance < 0) return 'secondary'; // Dealer owes us (advance)
    return 'default';
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Dealers</CardTitle>
            <CardDescription>
              Manage your suppliers and dealers.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsResetting(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button onClick={handleAddDealer}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Dealer
            </Button>
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
              {dealers?.map((dealer) => (
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

       <DealerDialog 
            isOpen={isDialogOpen} 
            onClose={() => setIsDialogOpen(false)}
            onSave={handleSaveDealer}
            dealer={selectedDealer}
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
