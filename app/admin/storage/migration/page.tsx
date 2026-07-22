import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { planMigration, scanBlobFiles } from "@/lib/storage/blob-migration";
import { scanStorageInventory } from "@/lib/storage/storage-inventory";
import StorageMaintenanceActions from "@/components/admin/storage/StorageMaintenanceActions";

export default async function StorageMigrationPage() {
  const actor = await requireLivePublisherAdmin();
  const files = await scanStorageInventory(actor.publisherId);
  const blobFiles = scanBlobFiles(files);
  const plan = planMigration(files);
  return <div className="space-y-6">
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="text-xl font-bold">Blob to R2 migration</h2><p className="mt-2 text-sm text-amber-900">Migration never runs automatically. Sources are retained, R2 uploads are verified, and database references use compare-and-swap updates.</p><p className="mt-3 font-semibold">{blobFiles.length} Blob files ready to plan.</p></section>
    <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Batch and resume controls</h2><p className="mt-2 text-sm text-slate-600">CLI: <code>node --conditions=react-server --import tsx scripts/migrate-blob-to-r2.ts --dry-run --limit 50 --offset 0</code></p><p className="mt-2 text-sm text-slate-600">Use <code>--resource ID</code> for one resource and <code>--resume</code> to skip verified manifest entries. Execution additionally requires <code>--execute</code> and the explicit safety environment flag.</p><a href="/api/admin/storage/report" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">Export storage report</a></section>
    <section className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-4">File</th><th>Record</th><th>Category</th><th>Planned destination</th></tr></thead><tbody>{plan.slice(0, 100).map(item => <tr key={item.id} className="border-t"><td className="p-4 font-semibold">{item.file.filename}</td><td>{item.file.title}</td><td>{item.file.scope}</td><td className="max-w-md break-all font-mono text-xs">{item.destinationKey}</td></tr>)}</tbody></table></section>
    <StorageMaintenanceActions retryFileId={blobFiles[0]?.id} />
  </div>;
}
