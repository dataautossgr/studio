
import CustomerLedgerDetail from './customer-detail';

// This is now a Server Component. It can pass params to a Client Component.
export default function CustomerLedgerPage({ params }: { params: { id: string } }) {
    return <CustomerLedgerDetail customerId={params.id} />;
}
