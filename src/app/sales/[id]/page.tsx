
import AutomotiveSaleForm from "../new/automotive-sale-form";

// This is a Server Component. It can pass params to a Client Component.
export default async function SaleFormPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <AutomotiveSaleForm saleId={id} />;
}
