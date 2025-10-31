'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bell, Users, Building, MoreVertical, Wallet, Pencil, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import type { Customer, Dealer } from '@/lib/data';
import { format, isToday, isPast, isTomorrow, startOfDay, addDays } from 'date-fns';
import Link from 'next/link';
import { Separator } from './ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
// Note: A generic payment dialog would be ideal here, but for simplicity, we'll link to the ledger.

interface DuePayment {
  id: string;
  name: string;
  type: 'Customer' | 'Dealer';
  balance: number;
  dueDate: Date;
}

export function DuePaymentsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [snoozedItems, setSnoozedItems] = useState<string[]>([]);
  const [editingDateItem, setEditingDateItem] = useState<DuePayment | null>(null);
  const [newDueDate, setNewDueDate] = useState<Date | undefined>();

  const firestore = useFirestore();
  const { toast } = useToast();

  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const dealersCollection = useMemoFirebase(() => collection(firestore, 'dealers'), [firestore]);

  const { data: customers } = useCollection<Customer>(customersCollection);
  const { data: dealers } = useCollection<Dealer>(dealersCollection);

  const duePayments: DuePayment[] = useMemo(() => {
    const allDue: DuePayment[] = [];
    
    const checkAndPush = (party: Customer | Dealer, type: 'Customer' | 'Dealer') => {
        if (party.balance > 0 && party.paymentDueDate) {
            const dueDate = startOfDay(new Date(party.paymentDueDate));
            if (isToday(dueDate) || isPast(dueDate) || isTomorrow(dueDate)) {
                if (!snoozedItems.includes(party.id)) {
                    allDue.push({ 
                        id: party.id, 
                        name: type === 'Customer' ? (party as Customer).name : (party as Dealer).company, 
                        type, 
                        balance: party.balance, 
                        dueDate 
                    });
                }
            }
        }
    };

    customers?.forEach(c => checkAndPush(c, 'Customer'));
    dealers?.forEach(d => checkAndPush(d, 'Dealer'));

    return allDue.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [customers, dealers, snoozedItems]);
  
  const handleSnooze = (id: string) => {
    setSnoozedItems(prev => [...prev, id]);
    toast({ title: 'Reminder Snoozed', description: 'This reminder will be hidden temporarily.' });
  };

  const handleExtendDueDate = async () => {
    if (!editingDateItem || !newDueDate || !firestore) return;
    
    const collectionName = editingDateItem.type === 'Customer' ? 'customers' : 'dealers';
    const docRef = doc(firestore, collectionName, editingDateItem.id);

    try {
        await setDoc(docRef, { paymentDueDate: newDueDate.toISOString() }, { merge: true });
        toast({ title: 'Due Date Updated', description: `Due date for ${editingDateItem.name} has been extended.` });
    } catch (error) {
        console.error("Failed to update due date:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update the due date.' });
    } finally {
        setEditingDateItem(null);
        setNewDueDate(undefined);
    }
  };

  const dueCount = duePayments.length;

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
        <Bell className="h-5 w-5" />
        {dueCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
            {dueCount}
          </span>
        )}
        <span className="sr-only">Due Payments</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pending Payment Alerts</DialogTitle>
            <DialogDescription>
              {dueCount > 0
                ? `You have ${dueCount} payments that are due, overdue, or due tomorrow.`
                : 'No pending payments are due at the moment.'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {duePayments.map((payment, index) => (
                <div key={payment.id} className="space-y-2">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <p className="font-semibold flex items-center gap-2">
                                {payment.type === 'Customer' ? <Users className="h-4 w-4 text-muted-foreground"/> : <Building className="h-4 w-4 text-muted-foreground"/>}
                                {payment.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                            Due on: {format(payment.dueDate, 'dd MMM, yyyy')}
                            </p>
                        </div>
                        <div className="text-right flex items-center gap-1">
                             <Badge variant={isPast(payment.dueDate) && !isToday(payment.dueDate) ? 'destructive' : 'secondary'}>
                                Rs. {payment.balance.toLocaleString()}
                            </Badge>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem asChild>
                                        <Link href={payment.type === 'Customer' ? `/customers/${payment.id}` : `/dealers/${payment.id}`} onClick={() => setIsOpen(false)}>
                                            <Wallet className="mr-2"/> Add Payment / View Ledger
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => { setEditingDateItem(payment); setNewDueDate(payment.dueDate); }}>
                                        <Pencil className="mr-2"/> Extend Due Date
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleSnooze(payment.id)}>
                                        <Clock className="mr-2"/> Snooze Reminder
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                        </div>
                    </div>
                    {index < duePayments.length - 1 && <Separator className="mt-4"/>}
                </div>
              ))}
              {dueCount === 0 && (
                <p className="text-center text-muted-foreground py-8">All clear! No payments are due.</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Popover for extending due date */}
      <Popover open={!!editingDateItem} onOpenChange={(open) => !open && setEditingDateItem(null)}>
        <PopoverTrigger asChild>
            <div />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
             <div className="p-4 space-y-2">
                <p className="text-sm font-medium">Extend due date for {editingDateItem?.name}</p>
                <Calendar
                    mode="single"
                    selected={newDueDate}
                    onSelect={setNewDueDate}
                    initialFocus
                />
            </div>
            <DialogFooter className="p-4 border-t">
                <Button variant="outline" onClick={() => setEditingDateItem(null)}>Cancel</Button>
                <Button onClick={handleExtendDueDate}>Save Date</Button>
            </DialogFooter>
        </PopoverContent>
      </Popover>
    </>
  );
}
