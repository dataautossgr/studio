import SaleFormDetail from './sale-detail';

export async function generateStaticParams() {
  return [];
}

export default function SaleFormPage() {
    return <SaleFormDetail />;
}
