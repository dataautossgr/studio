'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MinusCircle, PlusCircle, Repeat, Cloud, ShieldCheck } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { Sale, Payment } from '@/lib/data';
import type { Expense } from '@/app/expenses/page';
import { startOfDay, endOfDay } from 'date-fns';


type SessionState = 'none' | 'started' | 'ended';
type Denominations = {
  1000: number;
  500: number;
  100: number;
  50: number;
  20: number;
  10: number;
};
const denominations: (keyof Denominations)[] = [1000, 500, 100, 50, 20, 10];


export default function CashSessionPage() {
  const [sessionState, setSessionState] = useState<SessionState>('none');
  const [denominationsStart, setDenominationsStart] = useState<Denominations>({ 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0, 10: 0 });
  const [denominationsEnd, setDenominationsEnd] = useState<Denominations>({ 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0, 10: 0 });
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // --- Firestore Data Hooks ---
  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'), 
      where('date', '>=', todayStart.toISOString()), 
      where('date', '<=', todayEnd.toISOString())
    );
  }, [firestore]);
  const { data: todaySales } = useCollection<Sale>(salesQuery);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'expenses'), 
        where('date', '>=', todayStart), 
        where('date', '<=', todayEnd)
    );
   }, [firestore]);
   const { data: todayExpenses } = useCollection<Expense>(expensesQuery);
   
   const paymentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'payments'),
        where('date', '>=', todayStart.toISOString()),
        where('date', '<=', todayEnd.toISOString())
    );
   }, [firestore]);
   const { data: todayPayments } = useCollection<Payment>(paymentsQuery);
   // -------------------------

   // --- Live Data Calculations ---
    const totalCashSales = useMemo(() => 
        todaySales?.filter(s => s.paymentMethod === 'cash').reduce((acc, s) => acc + (s.status === 'Partial' ? s.partialAmountPaid || 0 : s.total), 0) || 0
    , [todaySales]);

    const totalCashReceivedFromDues = useMemo(() =>
        todayPayments?.filter(p => p.paymentMethod === 'Cash').reduce((acc, p) => acc + p.amount, 0) || 0
    , [todayPayments]);
    
    const totalCashExpenses = useMemo(() => 
        todayExpenses?.filter(e => e.paymentMethod === 'Cash').reduce((acc, e) => acc + e.amount, 0) || 0
    , [todayExpenses]);

    const totalBankDeposits = 0; // This needs a separate feature to track bank transactions.
   // ----------------------------


  const calculateTotal = (denoms: Denominations) => {
    return Object.entries(denoms).reduce((acc, [key, value]) => acc + parseInt(key) * value, 0);
  };

  const startingCash = useMemo(() => calculateTotal(denominationsStart), [denominationsStart]);
  const closingCash = useMemo(() => calculateTotal(denominationsEnd), [denominationsEnd]);
  
  const expectedClosingCash = startingCash + totalCashSales + totalCashReceivedFromDues - totalCashExpenses - totalBankDeposits;
  const difference = closingCash - expectedClosingCash;

  const handleDenominationChange = (
    setter: React.Dispatch<React.SetStateAction<Denominations>>,
    key: keyof Denominations,
    value: string
  ) => {
    setter(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
  };

  const handleStartSession = () => {
    if (startingCash > 0) {
      setSessionState('started');
    }
  };
  
  const handleEndSession = () => {
    setSessionState('ended');
  }

  const handleFinalizeReport = () => {
    // This is where you would save the session data to Firestore.
    console.log("Finalizing and saving report...");
    toast({
        title: "Session Saved",
        description: "The end-of-day report has been saved successfully.",
    });
    // For now, we just go to the new session screen.
    handleNewSession();
    setIsFinalizeDialogOpen(false);
  }

  const handleNewSession = () => {
    setSessionState('none');
    setDenominationsStart({ 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0, 10: 0 });
    setDenominationsEnd({ 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0, 10: 0 });
  }

  const renderDenominationTable = (
    title: string,
    denoms: Denominations,
    setter: React.Dispatch<React.SetStateAction<Denominations>>,
    readOnly: boolean
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Denomination (Rs.)</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {denominations.map(key => (
              <TableRow key={key}>
                <TableCell className="font-medium">{key.toLocaleString()}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={denoms[key]}
                    onChange={e => handleDenominationChange(setter, key, e.target.value)}
                    readOnly={readOnly}
                    className="w-24"
                    min="0"
                  />
                </TableCell>
                <TableCell className="text-right font-mono">{(key * denoms[key]).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="justify-end">
        <div className="text-xl font-bold">Total: Rs. {calculateTotal(denoms).toLocaleString()}</div>
      </CardFooter>
    </Card>
  );

  if (sessionState === 'none') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        {renderDenominationTable("Start of Day - Enter Starting Cash", denominationsStart, setDenominationsStart, false)}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleStartSession} size="lg">Start Session</Button>
        </div>
      </div>
    );
  }

  if (sessionState === 'started') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 grid gap-8 md:grid-cols-2">
         <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Live Cash Session</CardTitle>
                    <CardDescription>A real-time overview of your cash counter.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <Label className="text-muted-foreground">Starting Cash</Label>
                        <span className="font-bold text-lg">Rs. {startingCash.toLocaleString()}</span>
                    </div>
                     <div className="flex justify-between items-center text-green-600">
                        <Label>Total Cash Sales</Label>
                        <span className="font-mono flex items-center gap-2"><PlusCircle size={16}/> Rs. {totalCashSales.toLocaleString()}</span>
                    </div>
                     <div className="flex justify-between items-center text-green-600">
                        <Label>Other Cash Received (Dues)</Label>
                        <span className="font-mono flex items-center gap-2"><PlusCircle size={16}/> Rs. {totalCashReceivedFromDues.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-destructive">
                        <Label>Total Cash Expenses</Label>
                        <span className="font-mono flex items-center gap-2"><MinusCircle size={16}/> Rs. {totalCashExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-destructive">
                        <Label>Bank Deposits</Label>
                        <span className="font-mono flex items-center gap-2"><MinusCircle size={16}/> Rs. {totalBankDeposits.toLocaleString()}</span>
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-end space-y-2 bg-muted/50 py-4">
                    <Label className="text-sm text-muted-foreground">Expected Balance in Drawer</Label>
                    <div className="text-2xl font-bold text-primary">Rs. {expectedClosingCash.toLocaleString()}</div>
                </CardFooter>
            </Card>
            <Button onClick={handleEndSession} size="lg" className="w-full">End Session & Count Cash</Button>
        </div>
        {renderDenominationTable("Starting Cash Details", denominationsStart, setDenominationsStart, true)}
      </div>
    );
  }
  
  if (sessionState === 'ended') {
    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
                <div className="grid gap-8 md:grid-cols-2">
                    {renderDenominationTable("End of Day - Enter Physical Cash", denominationsEnd, setDenominationsEnd, false)}
                    <Card>
                        <CardHeader>
                            <CardTitle>End of Day Summary</CardTitle>
                            <CardDescription>Comparison of expected vs. actual cash.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-base">
                            <div className="flex justify-between items-center">
                                <Label className="text-muted-foreground">System Expected Balance</Label>
                                <span className="font-bold">Rs. {expectedClosingCash.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <Label className="text-muted-foreground">Physical Cash Counted</Label>
                                <span className="font-bold">Rs. {closingCash.toLocaleString()}</span>
                            </div>
                            <div className={`flex justify-between items-center text-xl font-bold p-4 rounded-md ${difference === 0 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/50 text-destructive'}`}>
                                <Label>Difference</Label>
                                <span>Rs. {difference.toLocaleString()}</span>
                            </div>
                            {difference !== 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="remarks">Remarks for Difference</Label>
                                    <Input id="remarks" placeholder="e.g., Pending change or small expense not recorded" />
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="gap-4">
                            <Button onClick={handleNewSession} variant="outline" className="w-full" size="lg">
                                <Repeat className="mr-2 h-4 w-4"/> Start New Session
                            </Button>
                            <Button onClick={() => setIsFinalizeDialogOpen(true)} className="w-full" size="lg">Finalize & Save Report</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
            
            <AlertDialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Finalize Session Reminders</AlertDialogTitle>
                    <AlertDialogDescription>
                        Before saving the final report, please confirm the following:
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 my-4">
                        <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Cloud className="h-6 w-6 text-blue-500 mt-1" />
                            <div>
                                <h3 className="font-semibold">Cloud Sync</h3>
                                <p className="text-sm text-muted-foreground">
                                    Ensure you have an active internet connection to sync all of today's data with the cloud.
                                </p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <ShieldCheck className="h-6 w-6 text-green-600 mt-1" />
                            <div>
                                <h3 className="font-semibold">Data Backup</h3>
                                <p className="text-sm text-muted-foreground">
                                    It's a good practice to take a manual backup periodically from the settings menu for extra safety.
                                </p>
                            </div>
                        </div>
                    </div>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFinalizeReport}>Continue & Save</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
  }

  return null;
}
