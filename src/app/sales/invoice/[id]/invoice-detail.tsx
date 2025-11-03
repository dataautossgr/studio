'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc, DocumentReference } from 'firebase/firestore';
import type { Sale, Customer } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useStoreSettings } from '@/context/store-settings-context';
import { useReactToPrint } from 'react-to-print';


interface EnrichedSale extends Omit<Sale, 'customer'> {
  customer: Customer | null;
}

type ReceiptSize = 'a4' | 'a5' | 'a6' | 'pos';

// Simple SVG for WhatsApp icon
const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.433-9.89-9.889-9.89-5.452 0-9.887 4.434-9.889 9.89.001 2.235.652 4.395 1.877 6.26l-1.165 4.25zM12.001 5.804c-3.415 0-6.19 2.775-6.19 6.19 0 1.562.57 3.002 1.548 4.145l.123.187-.847 3.103 3.179-.834.175.107c1.109.676 2.378 1.034 3.692 1.034 3.414 0 6.189-2.775 6.189-6.19 0-3.414-2.775-6.189-6.189-6.189zm4.394 8.352c-.193.334-1.359 1.6-1.574 1.799-.217.199-.442.249-.668.149-.226-.1-.497-.199-.942-.374-1.23-.486-2.5-1.5-3.473-2.977-.643-1.025-1.02-2.19-1.123-2.541-.123-.42-.038-.65.099-.824.111-.149.249-.199.374-.249.123-.05.249-.05.374.05.175.149.324.448.424.598.125.149.149.224.05.374-.025.05-.05.074-.074.1-.025.025-.05.025-.074.05-.075.05-.125.125-.175.174-.05.05-.1.1-.125.149-.025.025-.05.05-.074.05-.025.025-.05.05-.05.074s-.025.05-.025.075c.025.05.05.1.074.124.025.025.05.05.075.075.25.224.5.474.75.724.324.324.6.574.85.749.075.05.15.075.225.1.074.025.149.025.224.025.075 0 .15-.025.2-.05.226-.075.451-.575.526-.649.075-.075.175-.125.274-.125s.174.025.249.05c.1.025.5.249.574.424s.1.275.025.399c-.075.125-.224.274-.324.374z"/>
    </svg>
);

export default function InvoiceDetail() {
  const params = useParams();
  const firestore = useFirestore();
  const { settings } = useStoreSettings();
  const saleId = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [sale, setSale] = useState<EnrichedSale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptSize, setReceiptSize] = useState<ReceiptSize>('a4');

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

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onBeforeGetContent: () => {
        // This is a good place to ensure state is correct before printing
        // In our case, the className is already set by the component's state
    },
    pageStyle: `@page { size: auto; margin: 0mm; } @media print { body { -webkit-print-color-adjust: exact; } }`
  });

  const triggerPrint = (size: ReceiptSize) => {
    setReceiptSize(size);
    // Use a short timeout to allow React to re-render with the new class name before printing
    setTimeout(() => {
      handlePrint();
    }, 50);
  };
  
  const handleSendWhatsApp = () => {
    if (!sale || !sale.customer || !sale.customer.phone) {
        alert("Customer phone number is not available.");
        return;
    }

    // Basic phone number cleaning - assumes Pakistani number format
    let phoneNumber = sale.customer.phone.replace(/[^0-9]/g, '');
    if (phoneNumber.startsWith('0')) {
        phoneNumber = '92' + phoneNumber.substring(1);
    }
    
    const message = `Assalam-o-Alaikum, ${sale.customer.name}.\n\nThank you for your purchase from *${settings.storeName}*.\n\n*Invoice Summary:*\nInvoice #: ${sale.invoice}\nTotal Amount: Rs. ${sale.total.toLocaleString()}\nDate: ${format(new Date(sale.date), 'dd MMM, yyyy')}\n\nThank you for your business!`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };


  const subtotal = sale?.items.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;
  
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
  
  const balanceDue = sale.total - (sale.partialAmountPaid || 0);

  return (
    <div className="bg-gray-100">
      <div className="fixed top-4 right-4 z-50 flex flex-wrap gap-2 no-print">
            <Button variant="outline" asChild>
                <Link href="/sales">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Link>
            </Button>
            <Button onClick={handleSendWhatsApp}>
                <WhatsAppIcon />
                <span className="ml-2">WhatsApp</span>
            </Button>
            <div className="flex items-center gap-1 p-1 rounded-md bg-muted border">
                <Button size="sm" variant={receiptSize === 'a4' ? 'default' : 'ghost'} onClick={() => triggerPrint('a4')}>A4</Button>
                <Button size="sm" variant={receiptSize === 'a5' ? 'default' : 'ghost'} onClick={() => triggerPrint('a5')}>A5</Button>
                <Button size="sm" variant={receiptSize === 'a6' ? 'default' : 'ghost'} onClick={() => triggerPrint('a6')}>A6</Button>
                <Button size="sm" variant={receiptSize === 'pos' ? 'default' : 'ghost'} onClick={() => triggerPrint('pos')}>POS</Button>
            </div>
      </div>

      <main className="p-4 sm:p-8 print:bg-white print:p-0">
        <div ref={printRef} className={`printable-content print-${receiptSize}`}>
          <div className="receipt-main w-[800px] max-w-full mx-auto border border-black p-5 bg-white shadow-lg print:shadow-none print:border-none">
              {/* Header */}
              <div className="text-center mb-5">
                  <h2 className="text-lg font-bold hidden-pos">CASH MEMO</h2>
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
                          <tr key={`empty-${i}`} style={{height: '2.4rem'}} className="hidden-pos">
                              <td className="border border-black">&nbsp;</td>
                              <td className="border border-black"></td>
                              <td className="border border-black"></td>
                              <td className="border border-black"></td>
                          </tr>
                      ))}
                  </tbody>
                  <tfoot>
                      <tr>
                          <td colSpan={2} rowSpan={3} className="border-none align-bottom">
                              {sale.status !== 'Paid' && (
                                  <div className="text-sm p-2">
                                      <p className="font-bold">Payment Status: {sale.status}</p>
                                      {sale.status === 'Partial' && sale.partialAmountPaid && (
                                          <>
                                              <p>Amount Paid: Rs. {sale.partialAmountPaid.toLocaleString()}</p>
                                              <p className="font-bold">Balance Due: Rs. {balanceDue.toLocaleString()}</p>
                                          </>
                                      )}
                                      {sale.status === 'Unpaid' && (
                                          <p className="font-bold">Amount Due: Rs. {sale.total.toLocaleString()}</p>
                                      )}
                                  </div>
                              )}
                              {sale.status === 'Paid' && (
                                  <div className="text-sm p-2">
                                      <p className="font-bold">Status: Fully Paid</p>
                                      <p>Method: {sale.paymentMethod === 'online' ? `Online (${sale.onlinePaymentSource || 'N/A'})` : 'Cash'}</p>
                                  </div>
                              )}
                          </td>
                          <td className="text-right font-bold pr-2 pt-2">SUBTOTAL</td>
                          <td className="text-right border border-black p-2 font-mono">{subtotal.toLocaleString()}</td>
                      </tr>
                      <tr>
                          <td className="text-right font-bold pr-2">DISCOUNT</td>
                          <td className="text-right border border-black p-2 font-mono">{(sale.discount ?? 0).toLocaleString()}</td>
                      </tr>
                      <tr>
                          <td className="text-right font-bold pr-2 text-lg">TOTAL</td>
                          <td className="text-right border border-black p-2 font-mono font-bold text-lg">{sale.total.toLocaleString()}</td>
                      </tr>
                  </tfoot>
              </table>

              {/* Signature */}
              <div className="mt-8 text-sm flex justify-between">
                  <span className="font-bold">SIGNATURE: <span className="border-b border-black inline-block w-40">&nbsp;</span></span>
                  <p className="text-xs">Software by HAMXA TECH (0317-3890161)</p>
              </div>
          </div>
        </div>
      </main>
    </div>
  );
}
