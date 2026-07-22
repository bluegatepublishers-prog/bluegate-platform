import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { getPublisherLifecycleReport } from "@/lib/storage/storage-lifecycle-runtime";

export default async function StorageReportsPage() {
  const actor = await requireLivePublisherAdmin();
  const report = await getPublisherLifecycleReport(actor.publisherId);
  return <div className="space-y-5"><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Lifecycle reports</h2><p className="mt-2 text-slate-600">Publisher-scoped JSON exports never include signed URLs, credentials, bucket names, or legacy permanent URLs.</p><a href="/api/admin/storage/lifecycle-report" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">Export lifecycle JSON</a></section><section className="rounded-2xl border bg-white p-6"><h3 className="font-bold">Most downloaded resources</h3><ol className="mt-3 space-y-2">{report.mostDownloaded.slice(0, 25).map(row => <li key={row.file.id} className="flex justify-between rounded-xl bg-slate-50 p-3"><span>{row.file.title}</span><strong>{row.downloads}</strong></li>)}</ol></section></div>;
}
