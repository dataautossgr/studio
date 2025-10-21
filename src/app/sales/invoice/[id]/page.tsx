'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc, getDoc, DocumentReference } from 'firebase/firestore';
import type { Sale, Customer } from '@/lib/data';
import { useStoreSettings } from '@/context/store-settings-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Printer, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface EnrichedSale extends Omit<Sale, 'customer'> {
  customer: Customer | null;
}

export default function InvoicePage() {
  const params = useParams();
  const firestore = useFirestore();
  const { settings } = useStoreSettings();
  const saleId = params.id as string;

  const [sale, setSale] = useState<EnrichedSale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !saleId) return;

    const fetchSaleAndCustomer = async () => {
      setIsLoading(true);
      const saleRef = doc(firestore, 'sales', saleId);
      const saleSnap = await getDoc(saleRef);

      if (saleSnap.exists()) {
        const saleData = saleSnap.data() as Sale;
        let customerData: Customer | null = null;

        if (saleData.customer && saleData.customer instanceof DocumentReference) {
          const customerSnap = await getDoc(saleData.customer);
          if (customerSnap.exists()) {
            customerData = { id: customerSnap.id, ...customerSnap.data() } as Customer;
          }
        }
        setSale({ ...saleData, customer: customerData });
      }
      setIsLoading(false);
    };

    fetchSaleAndCustomer();
  }, [firestore, saleId]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading Invoice...</div>;
  }

  if (!sale) {
    return <div className="p-8 text-center text-destructive">Invoice not found.</div>;
  }
  
  const subtotal = sale.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-muted/30 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex justify-between items-center print:hidden">
            <Button variant="outline" asChild>
                <Link href="/sales">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sales
                </Link>
            </Button>
            <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print Invoice
            </Button>
        </div>

        <Card className="print:shadow-none print:border-none">
          <CardHeader className="bg-muted/50 p-6 print:bg-transparent">
            <div className="flex justify-between items-start">
              <div>
                {settings.logo ? (
                    <Image src={settings.logo} alt={settings.storeName} width={100} height={100} className="object-contain" />
                ) : (
                    <h1 className="text-2xl font-bold">{settings.storeName}</h1>
                )}
                <p className="text-muted-foreground text-sm max-w-xs">{settings.address}</p>
                <p className="text-muted-foreground text-sm">{settings.contact1}</p>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-primary tracking-wider">INVOICE</h2>
                <p className="text-lg font-mono">{sale.invoice}</p>
                <p className="text-sm text-muted-foreground">Date: {format(new Date(sale.date), 'dd MMM, yyyy')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <h3 className="font-semibold mb-2">Bill To:</h3>
                    <p className="font-bold">{sale.customer?.name || 'Walk-in Customer'}</p>
                    {sale.customer?.type === 'registered' && (
                        <>
                        <p className="text-sm text-muted-foreground">{sale.customer.phone}</p>
                        <p className="text-sm text-muted-foreground">{sale.customer.vehicleDetails}</p>
                        </>
                    )}
                </div>
                 <div className="text-right border-l pl-4">
                    <h3 className="font-semibold mb-2">Status:</h3>
                     <Badge variant={sale.status === 'Paid' ? 'default' : (sale.status === 'Partial' ? 'secondary' : 'destructive')} className="text-lg">
                        {sale.status}
                    </Badge>
                </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Item Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right font-mono">Rs. {item.price.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">Rs. {(item.price * item.quantity).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="flex justify-end mt-6">
                <div className="w-full max-w-sm space-y-3">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-mono">Rs. {subtotal.toLocaleString()}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="font-mono">- Rs. {sale.discount.toLocaleString()}</span>
                    </div>
                     <div className="flex justify-between text-lg font-bold border-t pt-3">
                        <span>Total:</span>
                        <span className="font-mono">Rs. {sale.total.toLocaleString()}</span>
                    </div>
                     {sale.status === 'Partial' && (
                         <>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Amount Paid:</span>
                                <span className="font-mono">Rs. {sale.partialAmountPaid?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-destructive">
                                <span>Balance Due:</span>
                                <span className="font-mono">Rs. {(sale.total - (sale.partialAmountPaid || 0)).toLocaleString()}</span>
                            </div>
                         </>
                    )}
                </div>
            </div>

             <div className="mt-12 text-center text-xs text-muted-foreground">
                <p>Thank you for your business!</p>
                <p>{settings.storeName} - {settings.contact1}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
