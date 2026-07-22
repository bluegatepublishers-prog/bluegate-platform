import StorageFileActions from "@/components/admin/storage/StorageFileActions";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { formatFileSizeBytes } from "@/lib/resource-helpers";
import { filterStorageFiles } from "@/lib/storage/storage-records";
import { scanStorageInventory } from "@/lib/storage/storage-inventory";

export default async function StorageFilesPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  const actor = await requireLivePublisherAdmin();
  const query = (await searchParams).query ?? "";
  const files = filterStorageFiles(await scanStorageInventory(actor.publisherId), query);
  return <div className="space-y-6">
    <form className="rounded-2xl border bg-white p-5"><label className="font-semibold">Search files, publisher, resource, book, MIME type, or date<input name="query" defaultValue={query} className="mt-2 w-full rounded-xl border px-4 py-3" /></label></form>
    <section className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[1100px] text-sm">
      <thead className="bg-slate-50 text-left"><tr><th className="p-4">Filename</th><th>Provider</th><th>Record</th><th>Size</th><th>MIME</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>{files.map(file => <tr key={file.id} className="border-t align-top">
        <td className="p-4"><strong>{file.filename}</strong><details className="mt-2"><summary className="cursor-pointer text-xs text-blue-700">View metadata</summary><p className="mt-2 max-w-xs break-all font-mono text-xs">{file.provider === "R2" ? file.value : "Legacy provider value withheld"}</p></details></td>
        <td>{file.provider}</td><td>{file.entityType}: {file.title}</td><td>{file.sizeBytes === null ? "Unknown" : formatFileSizeBytes(file.sizeBytes)}</td><td>{file.mimeType ?? "Unknown"}</td><td>{file.createdAt.toLocaleDateString("en-IN")}</td>
        <td className="py-4 pr-4"><StorageFileActions fileId={file.id} objectKey={file.provider === "R2" ? file.value : "Legacy provider value withheld"} /></td>
      </tr>)}</tbody>
    </table></section>
  </div>;
}
