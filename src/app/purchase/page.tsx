'use client';
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
import { MoreHorizontal, Pencil, PlusCircle, Trash2, Undo2, RotateCcw, CalendarDays } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { format, startOfDay, endOfDay } from 'date-fns';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, getDoc, type DocumentReference } from 'firebase/firestore';
import type { Purchase, Dealer } from '@/lib/data';

interface EnrichedPurchase extends Omit<Purchase, 'dealer'> {
  dealer: {
    id: string;
    name: string;
  }
}

export default function PurchasesPage() {
  const firestore = useFirestore();
  const purchasesCollection = useMemoFirebase(() => collection(firestore, 'purchases'), [firestore]);
  const { data: allPurchases, isLoading } = useCollection<Purchase>(purchasesCollection);

  const [enrichedPurchases, setEnrichedPurchases] = useState<EnrichedPurchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<EnrichedPurchase[]>([]);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [isResetting, setIsResetting] = useState(false);
  const [resetDateRange, setResetDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();

   useEffect(() => {
    if (!allPurchases) return;

    const enrichPurchasesData = async () => {
        const enriched = await Promise.all(allPurchases.map(async (purchase) => {
            let dealerName = 'N/A';
            let dealerId = '';

            if (purchase.dealer && typeof purchase.dealer === 'object' && 'id' in purchase.dealer) {
                const dealerRef = purchase.dealer as DocumentReference;
                try {
                    const dealerSnap = await getDoc(dealerRef);
                    if (dealerSnap.exists()) {
                        dealerName = (dealerSnap.data() as Dealer).name;
                        dealerId = dealerSnap.id;
                    }
                } catch(e) {
                    console.error("Error fetching dealer", e);
                }
            }
            return {
                ...purchase,
                dealer: { id: dealerId, name: dealerName }
            };
        }));
        setEnrichedPurchases(enriched);
    };

    enrichPurchasesData();
}, [allPurchases]);


  useEffect(() => {
    if (dateRange?.from) {
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        const filtered = enrichedPurchases.filter(purchase => {
            const purchaseDate = new Date(purchase.date);
            return purchaseDate >= from && purchaseDate <= to;
        });
        setFilteredPurchases(filtered);
    } else {
        setFilteredPurchases(enrichedPurchases);
    }
  }, [dateRange, enrichedPurchases]);

  const handleReset = () => {
    toast({ title: "Resetting...", description: "This feature is being updated for Firestore." });
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
          <div className="flex items-center gap-2">
             <Popover>
              <PopoverTrigger asChild>
                  <Button variant="outline">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                          dateRange.to ? (
                              <>
                                  {format(dateRange.from, "LLL dd, y")} -{" "}
                                  {format(dateRange.to, "LLL dd, y")}
                              </>
                          ) : (
                              format(dateRange.from, "LLL dd, y")
                          )
                      ) : (
                          <span>Pick a date range</span>
                      )}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                  />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                      <RotateCcw className="h-4 w-4" />
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-4 space-y-4">
                      <p className="text-sm text-muted-foreground">Select a date range to reset data for that period. Leave blank to reset all data.</p>
                      <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={resetDateRange?.from}
                          selected={resetDateRange}
                          onSelect={setResetDateRange}
                          numberOfMonths={1}
                      />
                      <Button variant="destructive" className="w-full" onClick={() => setIsResetting(true)}>
                          Reset Data
                      </Button>
                  </div>
              </PopoverContent>
            </Popover>
            
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
              {isLoading && (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading purchases...</TableCell>
                </TableRow>
              )}
              {filteredPurchases.map((purchase) => (
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
                {resetDateRange?.from
                    ? `This will reset purchase data from ${format(resetDateRange.from, 'PPP')} ${resetDateRange.to ? `to ${format(resetDateRange.to, 'PPP')}` : ''}. Any changes you've made in this period will be lost.`
                    : "This will reset the entire purchase history to its original state. Any changes you've made will be lost."
                }
                {' '}This will not affect your cloud backup.
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
