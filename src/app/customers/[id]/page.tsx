
import CustomerLedgerDetail from './customer-detail';

// This is now a Server Component. It can pass params to a Client Component.
export default async function CustomerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <CustomerLedgerDetail customerId={id} />;
}
