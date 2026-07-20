import MasterEntityForm from "@/components/admin/MasterEntityForm";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export default async function NewSubjectPage() {
  await requireLivePublisherAdmin();
  return <MasterEntityForm apiBase="/api/admin/master/subjects" title="Subject" mode="create" />;
}