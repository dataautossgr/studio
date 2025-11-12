
import CustomerLedgerDetail from './customer-detail';

export const dynamicParams = true;

// This is a Server Component. It passes params to a Client Component.
export default function CustomerLedgerPage({ params }: { params: { id: string } }) {
    return <CustomerLedgerDetail customerId={params.id} />;
}
