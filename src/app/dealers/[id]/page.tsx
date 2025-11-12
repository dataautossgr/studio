import DealerLedgerDetail from './dealer-detail';

// This is a Server Component. It can pass params to a Client Component.
export default async function DealerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DealerLedgerDetail dealerId={id} />;
}
