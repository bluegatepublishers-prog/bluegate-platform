import type { StorageFileRecord } from "./storage-records";

export type LifecycleAudit = { action: string; targetId: string | null; createdAt: Date; outcome: string };
export type LifecycleOptions = { now?: Date; oversizedBytes?: number; recentDays?: number };

export function generateLifecycleReports(files: readonly StorageFileRecord[], audits: readonly LifecycleAudit[], options: LifecycleOptions = {}) {
  const now = options.now ?? new Date();
  const recentSince = new Date(now.getTime() - (options.recentDays ?? 30) * 86_400_000);
  const downloads = audits.filter(event => event.action === "storage.download" && event.outcome === "SUCCESS");
  const repairs = audits.filter(event => event.action === "storage.repair" && event.outcome === "SUCCESS");
  const counts = new Map<string, number>();
  for (const event of downloads) if (event.targetId) counts.set(event.targetId, (counts.get(event.targetId) ?? 0) + 1);
  const sorted = [...files].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return {
    generatedAt: now.toISOString(),
    neverDownloaded: sorted.filter(file => !counts.has(file.entityId)),
    mostDownloaded: sorted.filter(file => counts.has(file.entityId)).map(file => ({ file, downloads: counts.get(file.entityId) ?? 0 })).sort((a, b) => b.downloads - a.downloads),
    legacyBlobRemaining: sorted.filter(file => file.provider === "BLOB"),
    missingMetadata: sorted.filter(file => !file.storedMimeType || file.sizeBytes === null),
    oversizedFiles: sorted.filter(file => file.sizeBytes !== null && file.sizeBytes > (options.oversizedBytes ?? 100 * 1024 * 1024)),
    unknownMime: sorted.filter(file => !file.mimeType),
    recentlyUploaded: sorted.filter(file => file.createdAt >= recentSince),
    recentlyRepaired: repairs.filter(event => event.createdAt >= recentSince),
  };
}

export function lifecycleReportJson(report: ReturnType<typeof generateLifecycleReports>) {
  return JSON.stringify(sanitizeLifecycleReport(report), (_key, value) => value instanceof Date ? value.toISOString() : value, 2);
}

function safeFile(file: StorageFileRecord) {
  return { ...file, value: file.provider === "R2" ? file.value : undefined };
}

export function sanitizeLifecycleReport(report: ReturnType<typeof generateLifecycleReports>) {
  return {
    ...report,
    neverDownloaded: report.neverDownloaded.map(safeFile),
    mostDownloaded: report.mostDownloaded.map(row => ({ ...row, file: safeFile(row.file) })),
    legacyBlobRemaining: report.legacyBlobRemaining.map(safeFile),
    missingMetadata: report.missingMetadata.map(safeFile),
    oversizedFiles: report.oversizedFiles.map(safeFile),
    unknownMime: report.unknownMime.map(safeFile),
    recentlyUploaded: report.recentlyUploaded.map(safeFile),
  };
}
