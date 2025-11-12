
import DealerLedgerDetail from './dealer-detail';

export const dynamicParams = true;

// This is now a Server Component. It can pass params to a Client Component.
export default function DealerLedgerPage({ params }: { params: { id: string } }) {
    return <DealerLedgerDetail dealerId={params.id} />;
}
