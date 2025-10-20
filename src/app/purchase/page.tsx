'use client';
import { getPurchases, type Purchase } from '@/lib/data';
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
import { MoreHorizontal, Pencil, PlusCircle, Trash2, Undo2, RotateCcw } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getPurchases().then(setPurchases);
  }, []);

  const handleReset = () => {
    getPurchases().then(setPurchases);
    toast({ title: "Purchases Reset", description: "The purchase history has been reset to its initial state." });
    setIsResetting(false);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'Paid':
            return 'default';
        case 'Unpaid':
            return 'destructive';
        case 'Partial':
            return 'secondary';
        default:
            return 'default';
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Purchase History</CardTitle>
            <CardDescription>
              View all past purchases from your dealers.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsResetting(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button asChild>
              <Link href="/purchase/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Purchase
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Dealer</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="hidden md:table-cell">
                    {format(new Date(purchase.date), 'dd MMM, yyyy, hh:mm a')}
                  </TableCell>
                  <TableCell>{purchase.dealer.name}</TableCell>
                  <TableCell className="font-medium">{purchase.invoiceNumber}</TableCell>
                  <TableCell className="text-right">Rs. {purchase.total.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusVariant(purchase.status)}>{purchase.status}</Badge>
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
                            <Link href={`/purchase/${purchase.id}`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Undo2 className="mr-2 h-4 w-4" />
                            Return Items
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
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
      
      <AlertDialog open={isResetting} onOpenChange={setIsResetting}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to reset?</AlertDialogTitle>
            <AlertDialogDescription>
                This will reset the purchase history to its original state. Any changes you've made will be lost. This will not affect your cloud backup.
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
