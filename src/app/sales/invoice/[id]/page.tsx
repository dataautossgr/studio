
import InvoiceDetail from './invoice-detail';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    await params;
    return <InvoiceDetail />;
}
