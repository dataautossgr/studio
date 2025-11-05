
'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import DealerLedgerDetail from './dealer-detail';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Purchase, DealerPayment } from '@/lib/data';

export default function DealerLedgerPage() {
    const params = useParams();
    const firestore = useFirestore();
    const dealerId = params.id as string;

    const purchasesQuery = useMemoFirebase(() => {
      if (!firestore || !dealerId) return null;
      return query(collection(firestore, 'purchases'), where('dealer', '==', doc(firestore, 'dealers', dealerId)));
    }, [firestore, dealerId]);

    const paymentsQuery = useMemoFirebase(() => {
      if (!firestore || !dealerId) return null;
      return query(collection(firestore, 'dealer_payments'), where('dealer', '==', doc(firestore, 'dealers', dealerId)));
    }, [firestore, dealerId]);

    const { data: dealerPurchases, isLoading: arePurchasesLoading } = useCollection<Purchase>(purchasesQuery);
    const { data: dealerPayments, isLoading: arePaymentsLoading } = useCollection<DealerPayment>(paymentsQuery);

    return <DealerLedgerDetail 
        dealerPurchases={dealerPurchases} 
        dealerPayments={dealerPayments}
        isLoading={arePurchasesLoading || arePaymentsLoading} 
    />;
}
