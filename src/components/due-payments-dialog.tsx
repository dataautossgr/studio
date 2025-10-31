'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bell, Users, Building } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Customer, Dealer } from '@/lib/data';
import { format, isToday, isPast } from 'date-fns';
import Link from 'next/link';
import { Separator } from './ui/separator';

interface DuePayment {
  id: string;
  name: string;
  type: 'Customer' | 'Dealer';
  balance: number;
  dueDate: Date;
}

export function DuePaymentsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();

  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const dealersCollection = useMemoFirebase(() => collection(firestore, 'dealers'), [firestore]);

  const { data: customers } = useCollection<Customer>(customersCollection);
  const { data: dealers } = useCollection<Dealer>(dealersCollection);

  const duePayments: DuePayment[] = useMemo(() => {
    const allDue: DuePayment[] = [];
    const today = new Date();

    customers?.forEach(c => {
      if (c.balance > 0 && c.paymentDueDate) {
        const dueDate = new Date(c.paymentDueDate);
        if (isToday(dueDate) || isPast(dueDate)) {
          allDue.push({ id: c.id, name: c.name, type: 'Customer', balance: c.balance, dueDate });
        }
      }
    });

    dealers?.forEach(d => {
      if (d.balance > 0 && d.paymentDueDate) {
        const dueDate = new Date(d.paymentDueDate);
        if (isToday(dueDate) || isPast(dueDate)) {
          allDue.push({ id: d.id, name: d.company, type: 'Dealer', balance: d.balance, dueDate });
        }
      }
    });

    return allDue.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [customers, dealers]);

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
                ? `You have ${dueCount} payments that are due or overdue.`
                : 'No pending payments are due at the moment.'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {duePayments.map((payment, index) => (
                <div key={index} className="space-y-2">
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
                        <div className="text-right">
                             <Badge variant={isPast(payment.dueDate) ? 'destructive' : 'secondary'}>
                                Rs. {payment.balance.toLocaleString()}
                            </Badge>
                        </div>
                    </div>
                     <Button variant="outline" size="sm" asChild className="w-full">
                        <Link href={payment.type === 'Customer' ? `/customers/${payment.id}` : `/dealers/${payment.id}`} onClick={() => setIsOpen(false)}>
                            View Ledger
                        </Link>
                    </Button>
                    {index < duePayments.length - 1 && <Separator className="mt-4"/>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
