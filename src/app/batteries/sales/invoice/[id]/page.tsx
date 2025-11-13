
import InvoiceDetail from './invoice-detail';

export default async function BatteryInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    await params;
    return <InvoiceDetail />;
}
