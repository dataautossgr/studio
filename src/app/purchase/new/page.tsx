
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AutomotivePurchaseForm from '../[id]/automotive-purchase-form';
import BatteryPurchaseForm from '@/app/batteries/purchases/page';
import { useSearchParams } from 'next/navigation';

export default function NewPurchasePage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'automotive';

  // This page is for creating NEW purchases. The forms themselves handle the edit logic.
  // The 'new' route will always render the forms in "new" mode.
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Tabs defaultValue={initialTab} className="w-full">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Create New Purchase</h1>
                <p className="text-muted-foreground">
                    Record a new purchase for automotive parts or batteries.
                </p>
            </div>
             <div className="flex items-center gap-4">
                <TabsList>
                    <TabsTrigger value="automotive">Automotive</TabsTrigger>
                    <TabsTrigger value="battery">Battery</TabsTrigger>
                </TabsList>
            </div>
        </div>
        <TabsContent value="automotive">
            <AutomotivePurchaseForm />
        </TabsContent>
        <TabsContent value="battery">
          <BatteryPurchaseForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
