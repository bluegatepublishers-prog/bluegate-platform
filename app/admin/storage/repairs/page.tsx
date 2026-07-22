import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { scanStorageInventory } from "@/lib/storage/storage-inventory";

export default async function StorageRepairsPage() {
  const actor = await requireLivePublisherAdmin();
  const files = (await scanStorageInventory(actor.publisherId)).filter(file => file.entityType === "Resource" && file.field === "fileUrl" && file.provider === "R2").slice(0, 200);
  return <div className="space-y-5"><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Metadata repairs</h2><p className="mt-2 text-slate-600">Repairs are explicit and idempotent. They fill missing resource MIME/size values or correct filenames only from verified object metadata. Existing verified values are not overwritten.</p></section><section className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr><th className="p-4">Resource</th><th>MIME</th><th>Size</th><th>Action</th></tr></thead><tbody>{files.map(file => <tr key={file.id} className="border-t"><td className="p-4">{file.title}<br/><span className="font-mono text-xs text-slate-500">{file.filename}</span></td><td>{file.mimeType ?? "Missing"}</td><td>{file.sizeBytes ?? "Missing"}</td><td><form action={`/api/admin/storage/files/${encodeURIComponent(file.id)}/repair`} method="post"><button className="rounded-lg border px-3 py-2 font-semibold">Verify and repair</button></form></td></tr>)}</tbody></table></section></div>;
}
