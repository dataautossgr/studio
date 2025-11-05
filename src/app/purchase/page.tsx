'use client';
import { Button } from '@/components/ui/button';
import { PlusCircle, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay } from 'date-fns';
import AutomotivePurchasesHistory from './automotive-purchases-history';
import BatteryPurchasesHistory from '../batteries/purchases/battery-purchases-history';


export default function PurchasesPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Tabs defaultValue="automotive">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchase History</h1>
            <p className="text-muted-foreground">
              View all past purchases from your dealers.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} -{' '}
                        {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
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
            <TabsList>
              <TabsTrigger value="automotive">Automotive</TabsTrigger>
              <TabsTrigger value="battery">Batteries</TabsTrigger>
            </TabsList>
            <div className="hidden md:flex items-center gap-2">
              <Button asChild>
                <Link href="/purchase/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Purchase
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="automotive">
            <AutomotivePurchasesHistory dateRange={dateRange}/>
        </TabsContent>
        <TabsContent value="battery">
          <BatteryPurchasesHistory dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
