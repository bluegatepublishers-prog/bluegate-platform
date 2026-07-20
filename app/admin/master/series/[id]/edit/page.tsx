import MasterEntityForm from "@/components/admin/MasterEntityForm";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireLivePublisherAdmin();
  const { id } = await params;
  return <MasterEntityForm apiBase="/api/admin/master/series" title="Series" mode="edit" id={id} includeDescription />;
}