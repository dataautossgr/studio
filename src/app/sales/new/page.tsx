'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AutomotiveSaleForm from './automotive-sale-form';
import BatterySaleForm from '@/app/batteries/sales/new/battery-sale-form';

export default function NewSalePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Tabs defaultValue="automotive" className="w-full">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Create New Sale</h1>
                <p className="text-muted-foreground">
                    Create a new transaction for automotive parts or batteries.
                </p>
            </div>
             <div className="flex items-center gap-4">
                <TabsList>
                    <TabsTrigger value="automotive">Automotive Sale</TabsTrigger>
                    <TabsTrigger value="battery">Battery Sale</TabsTrigger>
                </TabsList>
            </div>
        </div>
        <TabsContent value="automotive">
            <AutomotiveSaleForm />
        </TabsContent>
        <TabsContent value="battery">
          <BatterySaleForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
