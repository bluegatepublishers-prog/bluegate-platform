import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import MasterEntityForm from "@/components/admin/MasterEntityForm";

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
  await requireLivePublisherAdmin();
  const { id } = await params;
  return <MasterEntityForm apiBase="/api/admin/master/classes" title="Class" mode="edit" id={id} />;
}
