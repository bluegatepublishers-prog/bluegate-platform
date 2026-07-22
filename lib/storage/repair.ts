import type { StorageFileRecord } from "./storage-records";
import type { ObjectVerification } from "./verification";

export type StorageRepairChanges = { mimeType?: string; sizeBytes?: number; filename?: string; providerMetadata?: Record<string, string> };
export type StorageRepairPlan = { fileId: string; entityType: StorageFileRecord["entityType"]; entityId: string; field: string; expectedValue: string; expectedETag?: string; contentType?: string; changes: StorageRepairChanges; applicable: boolean; reason?: string };

export function planRepair(file: StorageFileRecord, verification: ObjectVerification): StorageRepairPlan {
  const base = { fileId: file.id, entityType: file.entityType, entityId: file.entityId, field: file.field, expectedValue: file.value };
  if (file.entityType !== "Resource" || file.field !== "fileUrl") return { ...base, changes: {}, applicable: false, reason: "This record has no repairable metadata columns." };
  if (!verification.exists || !verification.namespaceValid || !verification.metadata) return { ...base, changes: {}, applicable: false, reason: "Object identity and namespace must verify before repair." };
  const changes: StorageRepairChanges = {};
  const objectMime = verification.metadata.contentType?.trim().toLowerCase();
  const objectSize = verification.metadata.contentLength;
  const encodedFilename = verification.metadata.customMetadata?.["original-filename"]?.trim();
  let trustedFilename = encodedFilename;
  try { trustedFilename = encodedFilename ? decodeURIComponent(encodedFilename) : undefined; } catch { trustedFilename = encodedFilename; }
  if (!file.storedMimeType && objectMime) changes.mimeType = objectMime;
  if (file.sizeBytes === null && objectSize !== undefined && objectSize > 0) changes.sizeBytes = objectSize;
  if (trustedFilename && trustedFilename !== file.filename) changes.filename = trustedFilename;
  const providerMetadata = { ...(verification.metadata.customMetadata ?? {}) };
  let providerChanged = false;
  if (providerMetadata["upload-scope"] !== file.scope) { providerMetadata["upload-scope"] = file.scope; providerChanged = true; }
  if (!providerMetadata["original-filename"] && file.storedFilename) { providerMetadata["original-filename"] = encodeURIComponent(file.storedFilename); providerChanged = true; }
  if (providerChanged && verification.metadata.eTag) changes.providerMetadata = providerMetadata;
  const applicable = Object.keys(changes).length > 0;
  return { ...base, expectedETag: verification.metadata.eTag, contentType: objectMime, changes, applicable, reason: applicable ? undefined : "No safe metadata repair is needed." };
}

export async function applyRepair<T>(plan: StorageRepairPlan, dependencies: { compareAndSwap(plan: StorageRepairPlan): Promise<T | null>; compareAndSwapProviderMetadata?(plan: StorageRepairPlan): Promise<boolean>; audit(input: { plan: StorageRepairPlan; applied: boolean }): Promise<void> }) {
  if (!plan.applicable) return { applied: false, conflict: false, result: null as T | null };
  const hasDatabaseChanges = Boolean(plan.changes.mimeType || plan.changes.sizeBytes !== undefined || plan.changes.filename);
  const providerApplied = plan.changes.providerMetadata ? Boolean(await dependencies.compareAndSwapProviderMetadata?.(plan)) : false;
  const result = hasDatabaseChanges ? await dependencies.compareAndSwap(plan) : null;
  const applied = (hasDatabaseChanges ? result !== null : true) && (plan.changes.providerMetadata ? providerApplied : true);
  await dependencies.audit({ plan, applied });
  return { applied, conflict: !applied, result };
}
