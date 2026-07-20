
import MasterEntityList from "@/components/admin/MasterEntityList";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { getSubjects } from "@/lib/master/subjects";

export default async function SubjectsPage() {
  await requireLivePublisherAdmin();
  const subjects = await getSubjects();
  const rows = subjects.map((item) => ({ id: item.id, name: item.name, code: item.code, sortOrder: item.sortOrder, active: item.active }));

  return <MasterEntityList title="Subjects" apiBase="/api/admin/master/subjects" createHref="/admin/master/subjects/new" rows={rows} />;
}