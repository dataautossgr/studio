
import AutomotivePurchaseForm from "./automotive-purchase-form";

// This is a Server Component. It can pass params to a Client Component.
export default async function PurchaseFormPage({ params }: { params: Promise<{ id: string }> }) {
    await params;
    return <AutomotivePurchaseForm />;
}
