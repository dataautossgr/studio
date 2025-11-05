
'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import DealerLedgerDetail from './dealer-detail';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Purchase, Payment } from '@/lib/data';

export default function DealerLedgerPage() {
    const params = useParams();
    const firestore = useFirestore();
    const dealerId = params.id as string;

    const purchasesQuery = useMemoFirebase(() => {
      if (!firestore || !dealerId) return null;
      return query(collection(firestore, 'purchases'), where('dealer', '==', doc(firestore, 'dealers', dealerId)));
    }, [firestore, dealerId]);

    // This query is now removed to prevent the permission error.
    // The functionality will be restored in a future, more robust implementation.
    const paymentsQuery = null;

    const { data: dealerPurchases, isLoading: arePurchasesLoading } = useCollection<Purchase>(purchasesQuery);
    const { data: dealerPayments, isLoading: arePaymentsLoading } = useCollection<Payment>(paymentsQuery);

    return <DealerLedgerDetail 
        dealerPurchases={dealerPurchases} 
        dealerPayments={dealerPayments}
        isLoading={arePurchasesLoading || arePaymentsLoading} 
    />;
}
