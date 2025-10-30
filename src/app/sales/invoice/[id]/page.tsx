
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
  
  const totalRows = 15;
  const emptyRows = totalRows - sale.items.length > 0 ? totalRows - sale.items.length : 0;
  
  const ownerName = settings.coOwnerName ? `${settings.ownerName}, ${settings.coOwnerName}` : settings.ownerName;
  const phoneNumbers = [settings.contact1, settings.contact2, settings.contact3].filter(Boolean).join(' / ');


  return (
    <>
      <div className="controls fixed top-4 right-4 z-50 flex gap-2">
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

      <div className="print-container bg-gray-100 p-4 sm:p-8">
        <div className="cash-memo w-[800px] max-w-full mx-auto border border-black p-5 bg-white shadow-lg">
            <div className="header text-center mb-5">
                <h2 className="text-lg font-bold">CASH MEMO</h2>
                <h1 className="text-green-600 text-2xl font-bold mb-1 border-b-3 border-green-600 pb-1 inline-block">
                    {settings.storeName || 'DATA AUTOS & BATTERIES'}
                </h1>
                <h2 className="text-base font-bold">{settings.address || 'MIPURKHAS ROAD SANGHAR'}</h2>
                <p className="text-sm">Prop: {ownerName}, Ph# {phoneNumbers}</p>
            </div>

            <div className="details flex justify-between mb-4 text-sm">
                <div>
                    <span>S. No.: <span className="line-under w-20">{sale.invoice}</span></span>
                    <span className="ml-4">NAME: <span className="line-under w-64">{sale.customer?.name || 'Walk-in Customer'}</span></span>
                </div>
                <div>
                    <span>Date: <span className="line-under w-28">{format(new Date(sale.date), 'dd/MM/yyyy')}</span></span>
                </div>
            </div>

            <table className="memo-table w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className="w-[10%] bg-green-600 text-white text-center border border-black p-2">QTY</th>
                        <th className="w-[50%] bg-green-600 text-white text-center border border-black p-2">PARTICULAR</th>
                        <th className="w-[20%] bg-green-600 text-white text-center border border-black p-2">RATE</th>
                        <th className="w-[20%] bg-green-600 text-white text-center border border-black p-2">AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.items.map((item, index) => (
                         <tr key={index}>
                            <td className="text-center border border-black p-2">{item.quantity}</td>
                            <td className="border border-black p-2">{item.name}</td>
                            <td className="text-right border border-black p-2">Rs. {item.price.toLocaleString()}</td>
                            <td className="text-right border border-black p-2">Rs. {(item.price * item.quantity).toLocaleString()}</td>
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

                    <tr>
                        <td colSpan={3} className="total border-none text-right pt-4 pr-2 font-bold">TOTAL:</td>
                        <td className="total-box border border-black text-center font-bold p-2">Rs. {sale.total.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            <div className="signature mt-8 text-sm">
                <p>SIGNATURE: <span className="line-under w-40">&nbsp;</span></p>
            </div>
        </div>
      </div>
      <style jsx global>{`
        .line-under {
            border-bottom: 1px solid #000;
            display: inline-block;
            padding: 0 2px;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .cash-memo {
            box-shadow: none;
            border: 1px solid #000;
            margin: 0;
            width: 100%;
          }
          .controls {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
