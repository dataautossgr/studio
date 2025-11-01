import PurchaseFormDetail from './purchase-detail';

export async function generateStaticParams() {
  return [];
}

export default function PurchaseFormPage() {
    return <PurchaseFormDetail />;
}
