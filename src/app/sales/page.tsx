'use client';
import { Button } from '@/components/ui/button';
import { PlusCircle, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AutomotiveSalesHistory from './automotive-sales-history';
import BatterySalesHistory from '../batteries/sales/battery-sales-history';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay } from 'date-fns';

export default function SalesPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Tabs defaultValue="automotive">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
            <p className="text-muted-foreground">
              View all past transactions for automotive parts and batteries.
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
                <Link href="/sales/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Sale
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="automotive">
          <AutomotiveSalesHistory dateRange={dateRange} />
        </TabsContent>
        <TabsContent value="battery">
          <BatterySalesHistory dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
