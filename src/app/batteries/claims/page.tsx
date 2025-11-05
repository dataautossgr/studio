'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, MoreHorizontal, Eye } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';
import type { BatteryClaim, Customer } from '@/lib/data';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';


interface EnrichedClaim extends BatteryClaim {
    customerName: string;
}

export default function ClaimsHistoryPage() {
  const firestore = useFirestore();
  const claimsCollection = useMemoFirebase(() => collection(firestore, 'battery_claims'), [firestore]);
  const { data: claims, isLoading } = useCollection<BatteryClaim>(claimsCollection);
  
  const [enrichedClaims, setEnrichedClaims] = useState<EnrichedClaim[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!claims) return;

    const enrichClaims = async () => {
      const enriched = await Promise.all(
        claims.map(async (claim) => {
          let customerName = 'N/A';
          if (claim.customerId && firestore) {
            try {
              const customerRef = doc(firestore, 'customers', claim.customerId);
              const customerSnap = await getDoc(customerRef);
              if (customerSnap.exists()) {
                customerName = (customerSnap.data() as Customer).name;
              }
            } catch (e) {
                console.error("Error fetching customer for claim:", e);
            }
          }
          return { ...claim, customerName };
        })
      );
      setEnrichedClaims(enriched.sort((a, b) => new Date(b.claimDate).getTime() - new Date(a.claimDate).getTime()));
    };
    enrichClaims();
  }, [claims, firestore]);

  const handleExport = () => {
    if (enrichedClaims.length === 0) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'No claim data to export.' });
        return;
    }
    const headers = ['Claim ID', 'Date', 'Customer', 'Original Sale ID', 'Claimed Battery ID', 'Replacement Battery ID', 'Price Difference', 'Service Charges', 'Total Payable', 'Paid'];
    const csvContent = [
        headers.join(','),
        ...enrichedClaims.map(c => [
            c.id,
            format(new Date(c.claimDate), 'yyyy-MM-dd HH:mm'),
            `"${c.customerName.replace(/"/g, '""')}"`,
            c.originalSaleId,
            c.claimedBatteryId,
            c.replacementBatteryId,
            c.priceDifference,
            c.serviceCharges,
            c.totalPayable,
            c.isPaid
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `battery-claims-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: 'Your claims history has been downloaded.' });
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8">
       <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Battery Claims</h1>
                <p className="text-muted-foreground">
                    A complete history of all warranty claims.
                </p>
            </div>
             <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Claims History</CardTitle>
          <CardDescription>
            Browse through all recorded battery warranty claims.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Original Sale</TableHead>
                <TableHead className="text-right">Amount Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading claims history...
                  </TableCell>
                </TableRow>
              )}
              {enrichedClaims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell>{format(new Date(claim.claimDate), 'dd MMM, yyyy')}</TableCell>
                  <TableCell className="font-medium">{claim.customerName}</TableCell>
                  <TableCell>
                      <Button variant="link" asChild className="p-0 h-auto">
                        <Link href={`/batteries/sales/invoice/${claim.originalSaleId}`}>
                            View Invoice
                        </Link>
                      </Button>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    Rs. {claim.totalPayable.toLocaleString()}
                  </TableCell>
                  <TableCell>
                      <Badge variant={claim.isPaid ? 'default' : 'destructive'}>
                          {claim.isPaid ? 'Paid' : 'Unpaid'}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/batteries/claims/new?saleId=${claim.originalSaleId}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Claim Details
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
