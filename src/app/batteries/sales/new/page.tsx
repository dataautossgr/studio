'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NewBatterySalePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>New Battery Sale</CardTitle>
          <CardDescription>Create a new sale for batteries, including scrap trade-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>The new battery sale form will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
