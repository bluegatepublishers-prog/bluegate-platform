import MasterEntityForm from "@/components/admin/MasterEntityForm";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export default async function NewSeriesPage() {
  await requireLivePublisherAdmin();
  return <MasterEntityForm apiBase="/api/admin/master/series" title="Series" mode="create" includeDescription />;
}