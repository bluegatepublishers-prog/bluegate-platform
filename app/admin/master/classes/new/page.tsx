import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import MasterEntityForm from "@/components/admin/MasterEntityForm";

export default async function NewClassPage() {
  await requireLivePublisherAdmin();
  return <MasterEntityForm apiBase="/api/admin/master/classes" title="Class" mode="create" />;
}
