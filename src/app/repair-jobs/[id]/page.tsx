
import RepairJobFormDetail from './repair-job-detail';

// This is a Server Component. It can pass params to a Client Component.
export default async function RepairJobFormPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <RepairJobFormDetail jobId={id} />;
}
