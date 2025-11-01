import InvoiceDetail from './invoice-detail';

export async function generateStaticParams() {
  return [];
}

export default function InvoicePage() {
    return <InvoiceDetail />;
}
