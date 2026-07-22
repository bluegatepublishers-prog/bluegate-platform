import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { calculateStorageStatistics } from "@/lib/storage/storage-records";
import { getStorageActivityStatistics, scanStorageInventory } from "@/lib/storage/storage-inventory";
import { formatFileSizeBytes } from "@/lib/resource-helpers";
import StorageMaintenanceActions from "@/components/admin/storage/StorageMaintenanceActions";

export default async function StorageOverviewPage() {
  const actor = await requireLivePublisherAdmin();
  const [files, activity] = await Promise.all([scanStorageInventory(actor.publisherId), getStorageActivityStatistics(actor.publisherId)]);
  const statistics = calculateStorageStatistics(files);
  const migrationPercent = statistics.totalFiles ? Math.round((statistics.byProvider.R2 / statistics.totalFiles) * 100) : 100;
  const cards = [
    ["Total files", statistics.totalFiles], ["Known storage", formatFileSizeBytes(statistics.totalBytes)],
    ["Blob files", statistics.byProvider.BLOB], ["R2 files", statistics.byProvider.R2],
    ["Migration progress", `${migrationPercent}%`], ["Uploads today", activity.uploadsToday],
    ["Downloads today", activity.downloadsToday], ["Unknown sizes", statistics.totalFiles - statistics.knownSizeFiles],
  ];
  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</section>
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Storage by publisher</h2><div className="mt-4 flex justify-between rounded-xl bg-slate-50 p-4"><span>{files[0]?.publisherName ?? "Publisher"}</span><strong>{statistics.totalFiles} files · {formatFileSizeBytes(statistics.totalBytes)}</strong></div></section>
      <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Storage by type</h2><div className="mt-4 space-y-2">{Object.entries(statistics.byType).map(([type, value]) => <div key={type} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>{type}</span><strong>{value.files} · {formatFileSizeBytes(value.bytes)}</strong></div>)}</div></section>
    </div>
    <StorageMaintenanceActions retryFileId={files.find(file => file.provider === "BLOB")?.id} />
  </div>;
}
