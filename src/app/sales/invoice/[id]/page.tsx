
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
      <style jsx global>{`
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
          }
          .controls {
            display: none;
          }
        }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            background-color: #f4f4f4;
        }
        .cash-memo {
            width: 800px;
            max-width: 100%;
            margin: 20px auto;
            border: 1px solid #000;
            padding: 20px;
            background-color: #fff;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #008000; /* Green text color */
            font-size: 24px;
            margin-bottom: 5px;
            border-bottom: 3px solid #008000;
            padding-bottom: 5px;
            display: inline-block;
        }
        .header h2 {
            font-size: 16px;
            margin-top: 5px;
        }
        .details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 14px;
        }
        .details span {
            display: inline-block;
            margin-right: 15px;
        }
        .memo-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        .memo-table th, .memo-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }
        .memo-table th {
            background-color: #008000; /* Green header background */
            color: white;
            text-align: center;
        }
        .memo-table td.total {
            border: none;
            text-align: right;
            padding-top: 15px;
        }
        .memo-table td.total-box {
            border: 1px solid #000;
            text-align: center;
            width: 15%; /* Adjust width for the total box */
            font-weight: bold;
        }
        .signature {
            margin-top: 30px;
            font-size: 14px;
            text-align: left;
        }
        .line-under {
            border-bottom: 1px solid #000;
            display: inline-block;
            padding: 0 5px;
        }
      `}</style>

      <div className="p-4 sm:p-6 lg:p-8 bg-muted/30 min-h-screen">
         <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center controls">
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

        <div className="cash-memo print-container">
            <div className="header">
                <h2>CASH MEMO</h2>
                <h1>{settings.storeName || 'DATA AUTOS & BATTERIES'}</h1>
                <h2>{settings.address || 'MIPURKHAS ROAD SANGHAR'}</h2>
                <p>Prop: {ownerName}, Ph# {phoneNumbers}</p>
            </div>

            <div className="details">
                <div>
                    <span>S. No.: <span className="line-under" style={{width: '80px'}}>{sale.invoice}</span></span>
                    <span>NAME: <span className="line-under" style={{width: '250px'}}>{sale.customer?.name || 'Walk-in Customer'}</span></span>
                </div>
                <div>
                    <span>Date: <span className="line-under" style={{width: '100px'}}>{format(new Date(sale.date), 'dd/MM/yyyy')}</span></span>
                </div>
            </div>

            <table className="memo-table">
                <thead>
                    <tr>
                        <th style={{width: '10%'}}>QTY</th>
                        <th style={{width: '50%'}}>PARTICULAR</th>
                        <th style={{width: '20%'}}>RATE</th>
                        <th style={{width: '20%'}}>AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.items.map((item, index) => (
                         <tr key={index}>
                            <td className="text-center">{item.quantity}</td>
                            <td>{item.name}</td>
                            <td className="text-right">Rs. {item.price.toLocaleString()}</td>
                            <td className="text-right">Rs. {(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                    ))}
                    {Array.from({ length: emptyRows }).map((_, i) => (
                        <tr key={`empty-${i}`}>
                            <td>&nbsp;</td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                    ))}

                    <tr>
                        <td colSpan={3} className="total"><strong>TOTAL:</strong></td>
                        <td className="total-box">Rs. {sale.total.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            <div className="signature">
                <p>SIGNATURE: <span className="line-under" style={{width: '150px'}}>&nbsp;</span></p>
            </div>
        </div>
      </div>
    </>
  );
}
