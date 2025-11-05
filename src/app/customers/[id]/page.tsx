
'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import CustomerLedgerDetail from './customer-detail';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Sale, Payment } from '@/lib/data';

export default function CustomerLedgerPage() {
    const params = useParams();
    const firestore = useFirestore();
    const customerId = params.id as string;

    const salesQuery = useMemoFirebase(() => {
      if (!firestore || !customerId) return null;
      return query(collection(firestore, 'sales'), where('customer', '==', doc(firestore, 'customers', customerId)));
    }, [firestore, customerId]);

    const paymentsQuery = useMemoFirebase(() => {
      if (!firestore || !customerId) return null;
      return query(collection(firestore, 'payments'), where('customer', '==', doc(firestore, 'customers', customerId)));
    }, [firestore, customerId]);

    const { data: customerSales, isLoading: areSalesLoading } = useCollection<Sale>(salesQuery);
    const { data: customerPayments, isLoading: arePaymentsLoading } = useCollection<Payment>(paymentsQuery);

    return <CustomerLedgerDetail 
        customerSales={customerSales} 
        customerPayments={customerPayments}
        isLoading={areSalesLoading || arePaymentsLoading} 
    />;
}
