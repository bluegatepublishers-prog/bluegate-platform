import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/publisher-context";
import { calculateStorageStatistics } from "@/lib/storage/storage-records";
import { scanStorageInventory } from "@/lib/storage/storage-inventory";

export default async function SuperAdminStoragePage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
  await requireSuperAdmin();
  const rawOffset = Number((await searchParams).offset ?? 0);
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const publishers = await prisma.publisher.findMany({ orderBy: { name: "asc" }, skip: offset, take: 25, select: { id: true, name: true } });
  const rows = await Promise.all(publishers.map(async publisher => ({ publisher, statistics: calculateStorageStatistics(await scanStorageInventory(publisher.id)) })));
  return <div className="space-y-6"><header><p className="font-bold text-indigo-700">Super Admin</p><h1 className="text-3xl font-bold">Storage lifecycle</h1><p className="mt-2 text-slate-600">Bounded cross-publisher inventory. This page reads database references only and does not expose provider configuration.</p></header><section className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[750px] text-left text-sm"><thead><tr><th className="p-4">Publisher</th><th>Files</th><th>R2</th><th>Blob</th><th>Missing size</th></tr></thead><tbody>{rows.map(({ publisher, statistics }) => <tr key={publisher.id} className="border-t"><td className="p-4 font-semibold">{publisher.name}</td><td>{statistics.totalFiles}</td><td>{statistics.byProvider.R2}</td><td>{statistics.byProvider.BLOB}</td><td>{statistics.totalFiles - statistics.knownSizeFiles}</td></tr>)}</tbody></table></section>{publishers.length === 25 ? <a className="inline-flex rounded-xl border bg-white px-4 py-2 font-semibold" href={`/super-admin/storage?offset=${offset + 25}`}>Next publishers</a> : null}</div>;
}
