
import DealerLedgerDetail from './dealer-detail';

export async function generateStaticParams() {
  // Returning an empty array tells Next.js not to generate any pages at build time.
  // The pages will be generated on-demand at request time.
  return [];
}

// This is now a Server Component. It can pass params to a Client Component.
export default function DealerLedgerPage({ params }: { params: { id: string } }) {
    return <DealerLedgerDetail dealerId={params.id} />;
}
