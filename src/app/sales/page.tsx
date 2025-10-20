'use client';
import { getSales } from '@/lib/data';
import type { Sale } from '@/lib/data';
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
import { MoreHorizontal, FileText, PlusCircle, Pencil, Trash2, Undo2, RotateCcw, CalendarDays } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';

export default function SalesPage() {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });
  const [isResetting, setIsResetting] = useState(false);
  const [resetDateRange, setResetDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    getSales().then(setAllSales);
  }, []);

  useEffect(() => {
    if (dateRange?.from) {
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        const filtered = allSales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= from && saleDate <= to;
        });
        setFilteredSales(filtered);
    } else {
        setFilteredSales(allSales); // Show all if no date is selected
    }
  }, [dateRange, allSales]);

  const handleReset = () => {
    getSales().then(initialSales => {
        if (resetDateRange?.from) {
            const from = startOfDay(resetDateRange.from);
            const to = resetDateRange.to ? endOfDay(resetDateRange.to) : endOfDay(resetDateRange.from);

            const salesToKeep = allSales.filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate < from || saleDate > to;
            });
            
            const originalSalesInRange = initialSales.filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= from && saleDate <= to;
            });

            const newSales = [...salesToKeep, ...originalSalesInRange].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setAllSales(newSales);
            toast({ title: "Sales Reset", description: `Sales from ${format(from, 'PPP')} to ${format(to, 'PPP')} have been reset.` });

        } else {
            setAllSales(initialSales);
            toast({ title: "All Sales Reset", description: "The sales history has been reset to its initial state." });
        }
    });
    setResetDateRange(undefined);
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
            <CardTitle>Sales History</CardTitle>
            <CardDescription>
              View all past transactions and their status.
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
              <Link href="/sales/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Sale
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Date & Time</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.invoice}</TableCell>
                  <TableCell>{sale.customer.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {format(new Date(sale.date), 'dd MMM, yyyy, hh:mm a')}
                  </TableCell>
                  <TableCell>Rs. {sale.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(sale.status)}>{sale.status}</Badge>
                  </TableCell>
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
                        <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            View Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/sales/${sale.id}`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Undo2 className="mr-2 h-4 w-4" />
                            Return / Exchange
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
      
      <AlertDialog open={isResetting} onOpenChange={() => setIsResetting(false)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to reset?</AlertDialogTitle>
            <AlertDialogDescription>
                {resetDateRange?.from
                    ? `This will reset sales data from ${format(resetDateRange.from, 'PPP')} ${resetDateRange.to ? `to ${format(resetDateRange.to, 'PPP')}` : ''}. Any changes you've made in this period will be lost.`
                    : "This will reset the entire sales history to its original state. Any changes you've made will be lost."
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
