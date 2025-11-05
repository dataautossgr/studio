'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ClaimsStartPage() {
  const [saleId, setSaleId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleFindSale = async () => {
    if (!saleId.trim() || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please enter a valid Sale Invoice ID.',
      });
      return;
    }
    setIsLoading(true);
    try {
      // We check if the sale exists before navigating.
      const saleRef = doc(firestore, 'battery_sales', saleId.trim());
      const saleSnap = await getDoc(saleRef);

      if (saleSnap.exists()) {
        router.push(`/batteries/claims/new?saleId=${saleId.trim()}`);
      } else {
        toast({
          variant: 'destructive',
          title: 'Sale Not Found',
          description: `No battery sale found with the ID: ${saleId}`,
        });
      }
    } catch (error) {
      console.error('Error finding sale:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while trying to find the sale.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex justify-center items-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Process a Warranty Claim</CardTitle>
          <CardDescription>
            To begin a warranty claim, please enter the original invoice ID for the battery sale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="saleId">Original Sale Invoice ID</Label>
            <div className="flex gap-2">
              <Input
                id="saleId"
                value={saleId}
                onChange={(e) => setSaleId(e.target.value)}
                placeholder="e.g., B-INV-2024-0012"
                onKeyDown={(e) => e.key === 'Enter' && handleFindSale()}
              />
              <Button onClick={handleFindSale} disabled={isLoading}>
                <Search className="mr-2 h-4 w-4" />
                {isLoading ? 'Searching...' : 'Find Sale'}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                You can find the sale ID on the customer's original invoice or in the battery sales history.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
