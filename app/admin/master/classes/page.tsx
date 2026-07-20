import { getClasses } from "@/lib/master/classes";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import MasterEntityList from "@/components/admin/MasterEntityList";

export const metadata = {
  title: "Classes | Bluegate Admin",
};

export default async function ClassesPage() {
  await requireLivePublisherAdmin();
  const classes = await getClasses();

  const rows = classes.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    sortOrder: item.sortOrder,
    active: item.active,
  }));

  return (
    <MasterEntityList title="Classes" apiBase="/api/admin/master/classes" createHref="/admin/master/classes/new" rows={rows} />
  );
}
