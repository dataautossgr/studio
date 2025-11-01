
import PurchaseFormDetail from './purchase-detail';

export async function generateStaticParams() {
  // Returning an empty array tells Next.js not to generate any pages at build time.
  // The pages will be generated on-demand at request time.
  return [];
}

export default function PurchaseFormPage() {
    return <PurchaseFormDetail />;
}
