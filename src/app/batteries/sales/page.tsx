'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function BatterySalesPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Battery Sales</CardTitle>
          <CardDescription>View all battery sales history.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Battery sales history will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
