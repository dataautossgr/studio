
'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import DealerLedgerDetail from './dealer-detail';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Purchase } from '@/lib/data';

export default function DealerLedgerPage() {
    const params = useParams();
    const firestore = useFirestore();
    const dealerId = params.id as string;

    const purchasesQuery = useMemoFirebase(() => {
      if (!firestore || !dealerId) return null;
      return query(collection(firestore, 'purchases'), where('dealer', '==', doc(firestore, 'dealers', dealerId)));
    }, [firestore, dealerId]);

    const { data: dealerPurchases, isLoading: arePurchasesLoading } = useCollection<Purchase>(purchasesQuery);

    return <DealerLedgerDetail 
        dealerPurchases={dealerPurchases} 
        dealerPayments={[]} // Pass an empty array to avoid breaking the component
        isLoading={arePurchasesLoading} 
    />;
}
