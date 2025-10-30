
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc, DocumentReference } from 'firebase/firestore';
import type { Sale, Customer } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useStoreSettings } from '@/context/store-settings-context';


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
      try {
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
      } catch (error) {
        console.error("Error fetching invoice data:", error);
      }
      setIsLoading(false);
    };

    fetchSaleAndCustomer();
  }, [firestore, saleId]);
  
  const subtotal = sale?.items.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
  const discount = sale?.discount || 0;
  const total = sale?.total || 0;
  
  const totalRows = 15;
  const emptyRows = sale ? (totalRows - sale.items.length > 0 ? totalRows - sale.items.length : 0) : totalRows;
  
  const ownerName = settings.coOwnerName ? `${settings.ownerName}, ${settings.coOwnerName}` : settings.ownerName;
  const phoneNumbers = [settings.contact1, settings.contact2, settings.contact3].filter(Boolean).join(' / ');


  if (isLoading) {
    return <div className="p-8 text-center">Loading Invoice...</div>;
  }

  if (!sale) {
    return <div className="p-8 text-center text-destructive">Invoice not found.</div>;
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
            <Button variant="outline" asChild>
                <Link href="/sales">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Link>
            </Button>
            <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print
            </Button>
        </div>

      <main className="bg-gray-100 p-4 sm:p-8 print:bg-white print:p-0">
        <div className="w-[800px] max-w-full mx-auto border border-black p-5 bg-white shadow-lg print:shadow-none print:border-none">
            {/* Header */}
            <div className="text-center mb-5">
                <h2 className="text-lg font-bold">CASH MEMO</h2>
                <h1 className="text-green-600 text-2xl font-bold mb-1 border-b-4 border-green-600 pb-1 inline-block">
                    {settings.storeName || 'DATA AUTOS & BATTERIES'}
                </h1>
                <h2 className="text-base font-bold">{settings.address || 'MIPURKHAS ROAD SANGHAR'}</h2>
                <p className="text-sm">Prop: {ownerName || 'Ameer Hamza'}, Ph# {phoneNumbers || '0317-3890161'}</p>
            </div>

            {/* Details */}
            <div className="flex justify-between mb-4 text-sm">
                <div>
                    <span className="font-bold">S. No.:</span>
                    <span className="border-b border-black inline-block px-2 min-w-[80px]">{sale.invoice}</span>
                    <span className="ml-4 font-bold">NAME:</span>
                    <span className="border-b border-black inline-block px-2 min-w-[250px]">{sale.customer?.name || 'Walk-in Customer'}</span>
                </div>
                <div>
                    <span className="font-bold">Date:</span>
                    <span className="border-b border-black inline-block px-2 min-w-[100px]">{format(new Date(sale.date), 'dd/MM/yyyy')}</span>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className="w-[10%] bg-green-600 text-white text-center border border-black p-2 font-bold">QTY</th>
                        <th className="w-[50%] bg-green-600 text-white text-center border border-black p-2 font-bold">PARTICULAR</th>
                        <th className="w-[20%] bg-green-600 text-white text-center border border-black p-2 font-bold">RATE</th>
                        <th className="w-[20%] bg-green-600 text-white text-center border border-black p-2 font-bold">AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.items.map((item, index) => (
                         <tr key={index}>
                            <td className="text-center border border-black p-2">{item.quantity}</td>
                            <td className="border border-black p-2">{item.name}</td>
                            <td className="text-right border border-black p-2 font-mono">{item.price.toLocaleString()}</td>
                            <td className="text-right border border-black p-2 font-mono">{(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                    ))}
                    {Array.from({ length: emptyRows }).map((_, i) => (
                        <tr key={`empty-${i}`} style={{height: '2.4rem'}}>
                            <td className="border border-black">&nbsp;</td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={2} className="border-none"></td>
                        <td className="text-right font-bold pr-2 pt-2">SUBTOTAL</td>
                        <td className="text-right border border-black p-2 font-mono">{subtotal.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td colSpan={2} className="border-none"></td>
                        <td className="text-right font-bold pr-2">DISCOUNT</td>
                        <td className="text-right border border-black p-2 font-mono">{discount.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td colSpan={2} className="border-none"></td>
                        <td className="text-right font-bold pr-2 text-lg">TOTAL</td>
                        <td className="text-right border border-black p-2 font-mono font-bold text-lg">{total.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Signature */}
            <div className="mt-8 text-sm">
                <span className="font-bold">SIGNATURE: </span>
                <span className="border-b border-black inline-block w-40">&nbsp;</span>
            </div>
        </div>
      </main>
    </>
  );
}
