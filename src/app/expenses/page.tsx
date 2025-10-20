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
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Trash2,
  FileText,
  TrendingUp,
  DollarSign,
  RotateCcw,
  CalendarDays,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useEffect, useState, useMemo } from 'react';
import { ExpenseDialog, type ExpenseFormData } from './expense-dialog';
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
} from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';


export interface Expense {
  id: string;
  date: Date;
  category: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank' | 'Credit';
  paidTo: string;
  description?: string;
  attachmentUrl?: string;
}

const mockExpenses: Expense[] = [
  {
    id: 'EXP001',
    date: new Date('2024-07-22T10:00:00Z'),
    category: 'Rent / Property',
    amount: 12000,
    paymentMethod: 'Bank',
    paidTo: 'Ali Real Estate',
    description: 'Shop Rent for July',
  },
  {
    id: 'EXP002',
    date: new Date('2024-07-21T15:30:00Z'),
    category: 'Utility Bills',
    amount: 3500,
    paymentMethod: 'Cash',
    paidTo: 'LESCO',
    description: 'Electricity Bill',
  },
  {
    id: 'EXP003',
    date: new Date(),
    category: 'Staff Salary',
    amount: 25000,
    paymentMethod: 'Bank',
    paidTo: 'Ameer Hamza',
    description: 'Salary for July',
  },
   {
    id: 'EXP004',
    date: new Date(),
    category: 'Miscellaneous / Others',
    amount: 500,
    paymentMethod: 'Cash',
    paidTo: 'Local Shop',
    description: 'Office stationery',
  },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(
    null
  );
  const [isResetting, setIsResetting] = useState(false);
  const [resetDateRange, setResetDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    // Simulating data fetch
    setExpenses(mockExpenses);
  }, []);

  const { todaysTotal, thisMonthsTotal } = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todaysTotal = expenses
      .filter((exp) => exp.date >= startOfToday)
      .reduce((sum, exp) => sum + exp.amount, 0);

    const thisMonthsTotal = expenses
      .filter((exp) => exp.date >= startOfMonth)
      .reduce((sum, exp) => sum + exp.amount, 0);

    return { todaysTotal, thisMonthsTotal };
  }, [expenses]);

  const handleAddExpense = () => {
    setSelectedExpense(null);
    setIsDialogOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDialogOpen(true);
  };

  const handleSaveExpense = (expenseData: ExpenseFormData) => {
    if (selectedExpense) {
      setExpenses(
        expenses.map((e) =>
          e.id === selectedExpense.id ? { ...selectedExpense, ...expenseData } : e
        )
      );
      toast({ title: 'Success', description: 'Expense updated successfully.' });
    } else {
      const newExpense: Expense = {
        ...expenseData,
        id: `EXP${Date.now()}`,
      };
      setExpenses([newExpense, ...expenses].sort((a,b) => b.date.getTime() - a.date.getTime()));
      toast({ title: 'Success', description: 'Expense added successfully.' });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteExpense = () => {
    if (!expenseToDelete) return;
    setExpenses(expenses.filter((e) => e.id !== expenseToDelete.id));
    toast({
      title: 'Expense Deleted',
      description: 'The expense has been removed.',
    });
    setExpenseToDelete(null);
  };

  const handleReset = () => {
     if (resetDateRange?.from) {
        const from = startOfDay(resetDateRange.from);
        const to = resetDateRange.to ? endOfDay(resetDateRange.to) : endOfDay(resetDateRange.from);

        const expensesToKeep = expenses.filter(exp => {
            const expenseDate = new Date(exp.date);
            return expenseDate < from || expenseDate > to;
        });
        
        const originalExpensesInRange = mockExpenses.filter(exp => {
            const expenseDate = new Date(exp.date);
            return expenseDate >= from && expenseDate <= to;
        });

        const newExpenses = [...expensesToKeep, ...originalExpensesInRange].sort((a,b) => b.date.getTime() - a.date.getTime());
        
        setExpenses(newExpenses);
        toast({ title: "Expenses Reset", description: `Expenses from ${format(from, 'PPP')} to ${format(to, 'PPP')} have been reset.` });
    } else {
        setExpenses(mockExpenses);
        toast({ title: "All Expenses Reset", description: "The expense list has been reset to its initial state." });
    }
    setResetDateRange(undefined);
    setIsResetting(false);
  };

  const reportCards = [
    {
      title: "Today's Total Expense",
      value: `Rs. ${todaysTotal.toLocaleString()}`,
      icon: DollarSign,
    },
    {
      title: "This Month's Expense",
      value: `Rs. ${thisMonthsTotal.toLocaleString()}`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">
            Track and manage all your business expenses.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                  <Button variant="outline">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {resetDateRange?.from ? (
                          resetDateRange.to ? (
                              <>
                                  {format(resetDateRange.from, "LLL dd, y")} -{" "}
                                  {format(resetDateRange.to, "LLL dd, y")}
                              </>
                          ) : (
                              format(resetDateRange.from, "LLL dd, y")
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
                      defaultMonth={resetDateRange?.from}
                      selected={resetDateRange}
                      onSelect={setResetDateRange}
                      numberOfMonths={2}
                  />
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={() => setIsResetting(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button onClick={handleAddExpense}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
        </div>
      </div>

       <div className="grid gap-4 md:grid-cols-2">
        {reportCards.map((card, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>A list of all recorded expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Paid To</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    {format(expense.date, 'dd MMM, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{expense.category}</Badge>
                  </TableCell>
                  <TableCell>{expense.paidTo}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {expense.description}
                  </TableCell>
                  <TableCell>{expense.paymentMethod}</TableCell>
                  <TableCell className="text-right font-mono">
                    Rs. {expense.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={() => handleEditExpense(expense)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {expense.attachmentUrl && (
                            <DropdownMenuItem asChild>
                                <a href={expense.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Attachment
                                </a>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onSelect={() => setExpenseToDelete(expense)}
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

      <ExpenseDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveExpense}
        expense={selectedExpense}
      />

      <AlertDialog
        open={!!expenseToDelete}
        onOpenChange={() => setExpenseToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the expense record for "
              {expenseToDelete?.description || expenseToDelete?.category}". This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResetting} onOpenChange={setIsResetting}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to reset?</AlertDialogTitle>
            <AlertDialogDescription>
                 {resetDateRange?.from
                    ? `This will reset expense data from ${format(resetDateRange.from, 'PPP')} ${resetDateRange.to ? `to ${format(resetDateRange.to, 'PPP')}` : ''}. Any changes you've made in this period will be lost.`
                    : "This will reset the entire expense list to its original state. Any changes you've made will be lost."
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
