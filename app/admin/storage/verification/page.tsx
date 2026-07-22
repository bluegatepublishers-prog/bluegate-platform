import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { verifyPublisherStorage } from "@/lib/storage/storage-lifecycle-runtime";

export default async function StorageVerificationPage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
  const actor = await requireLivePublisherAdmin();
  const rawOffset = Number((await searchParams).offset ?? 0);
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const report = await verifyPublisherStorage(actor, { offset, limit: 100 }).catch(() => null);
  if (!report) return <section className="rounded-2xl border border-red-200 bg-red-50 p-6"><h2 className="text-xl font-bold">Verification unavailable</h2><p className="mt-2">The provider could not be checked. No file metadata was changed.</p></section>;
  return <div className="space-y-5"><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Object verification</h2><p className="mt-2 text-slate-600">Read-only, publisher-scoped checks for existence, namespace, size, MIME and available checksums. Up to 100 references are checked per page.</p></section><section className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr><th className="p-4">File</th><th>Exists</th><th>Namespace</th><th>Metadata</th><th>Checksum</th><th>Result</th></tr></thead><tbody>{report.results.map(result => <tr key={result.fileId} className="border-t"><td className="p-4 font-mono text-xs">{result.fileId}</td><td>{result.exists ? "Yes" : "No"}</td><td>{result.namespaceValid ? "Valid" : "Invalid"}</td><td>{result.mismatches.length ? `${result.mismatches.length} mismatch(es)` : "Match"}</td><td>{result.checksumCompared ? result.checksumMatches ? "Match" : "Mismatch" : "Unavailable"}</td><td className="font-semibold">{result.verified ? "Verified" : "Attention needed"}</td></tr>)}</tbody></table></section>{report.hasMore ? <a className="inline-flex rounded-xl border bg-white px-4 py-2 font-semibold" href={`/admin/storage/verification?offset=${offset + report.checked}`}>Next page</a> : null}</div>;
}
