import DealerLedgerDetail from './dealer-detail';

// This is a Server Component. It passes params to a Client Component.
export default function DealerLedgerPage({ params }: { params: { id: string } }) {
    return <DealerLedgerDetail dealerId={params.id} />;
}
