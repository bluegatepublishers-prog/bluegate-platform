import type { StorageFileRecord } from "./storage-records";
import type { StorageObjectMetadata } from "./types";

export type UploadAuditSnapshot = { id: string; actorUserId: string | null; action: string; createdAt: Date; metadata: unknown };
export type ReconciliationIssue = { type: "OBJECT_WITHOUT_DB" | "DB_WITHOUT_OBJECT" | "ABANDONED_UPLOAD" | "ORPHAN_COMPLETION"; objectKey?: string; fileId?: string; auditId?: string; message: string };

export function generateReconciliationReport(files: readonly StorageFileRecord[], objects: readonly StorageObjectMetadata[], audits: readonly UploadAuditSnapshot[], now = new Date()) {
  const references = new Map(files.filter(file => file.provider === "R2").map(file => [file.value, file]));
  const objectKeys = new Set(objects.map(object => object.key));
  const issues: ReconciliationIssue[] = [];
  for (const object of objects) if (!references.has(object.key)) issues.push({ type: "OBJECT_WITHOUT_DB", objectKey: object.key, message: "Uploaded object has no completed database reference." });
  for (const [key, file] of references) if (!objectKeys.has(key)) issues.push({ type: "DB_WITHOUT_OBJECT", fileId: file.id, objectKey: key, message: "Database reference has no matching object." });
  const cutoff = now.getTime() - 60 * 60 * 1000;
  const completions = audits.filter(event => event.action === "storage.upload.complete");
  for (const event of audits.filter(event => event.action === "storage.upload.init" && event.createdAt.getTime() < cutoff)) {
    const later = completions.some(completion => completion.actorUserId === event.actorUserId && completion.createdAt >= event.createdAt);
    if (!later) issues.push({ type: "ABANDONED_UPLOAD", auditId: event.id, message: "Upload initialization has no later completion audit. Session identity is unavailable in the current schema." });
  }
  for (const event of completions) if (!event.actorUserId) issues.push({ type: "ORPHAN_COMPLETION", auditId: event.id, message: "Upload completion is not linked to an actor." });
  return { generatedAt: now.toISOString(), filesChecked: files.length, objectsChecked: objects.length, auditEventsChecked: audits.length, issues };
}

export async function retryCompletion<T>(issue: ReconciliationIssue, dependencies: { verify(issue: ReconciliationIssue): Promise<boolean>; complete(issue: ReconciliationIssue): Promise<T>; audit(input: { issue: ReconciliationIssue; succeeded: boolean }): Promise<void> }) {
  if (issue.type !== "OBJECT_WITHOUT_DB") throw new Error("Only verified incomplete object uploads can be retried.");
  const verified = await dependencies.verify(issue);
  if (!verified) { await dependencies.audit({ issue, succeeded: false }); return { completed: false, result: null as T | null }; }
  const result = await dependencies.complete(issue);
  await dependencies.audit({ issue, succeeded: true });
  return { completed: true, result };
}
