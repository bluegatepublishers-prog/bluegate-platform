import MasterEntityList from "@/components/admin/MasterEntityList";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { getSeries } from "@/lib/master/series";

export default async function SeriesPage() {
  await requireLivePublisherAdmin();
  const series = await getSeries();
  const rows = series.map((item) => ({ id: item.id, name: item.name, code: item.code, sortOrder: 0, active: item.active, description: item.description ?? null }));
  return <MasterEntityList title="Series" apiBase="/api/admin/master/series" createHref="/admin/master/series/new" rows={rows} includeDescription />;
}