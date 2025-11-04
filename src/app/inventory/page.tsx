
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AutomotiveInventory from './automotive-inventory';
import BatteryInventory from './battery-inventory';

export default function InventoryPage() {

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <Tabs defaultValue="automotive" className="w-full">
         <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                <p className="text-muted-foreground">
                    Manage your products from one screen.
                </p>
            </div>
             <div className="flex items-center gap-4">
                <TabsList>
                    <TabsTrigger value="automotive">Automotive</TabsTrigger>
                    <TabsTrigger value="batteries">Batteries</TabsTrigger>
                </TabsList>
            </div>
        </div>
        <TabsContent value="automotive">
          <AutomotiveInventory />
        </TabsContent>
        <TabsContent value="batteries">
          <BatteryInventory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
