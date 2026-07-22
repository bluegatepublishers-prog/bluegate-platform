import { createHash } from "node:crypto";
import type { StorageObjectMetadata } from "./types";
import type { StorageFileRecord } from "./storage-records";
import { sanitizeUploadFilename, uploadPrefixForScope } from "./upload-policy";

export type MigrationPlanItem = {
  id: string;
  file: StorageFileRecord;
  sourceUrl: string;
  destinationKey: string;
};

export type MigrationManifestEntry = {
  id: string;
  entityType: StorageFileRecord["entityType"];
  entityId: string;
  field: string;
  arrayIndex?: number;
  publisherId: string;
  sourceUrl: string;
  destinationKey: string;
  status: "PLANNED" | "MIGRATED" | "ALREADY_MIGRATED" | "FAILED" | "CONFLICT";
  verified: boolean;
  sizeBytes?: number;
  contentType?: string;
  errorCode?: string;
};

export interface BlobMigrationDependencies {
  fetchSource(url: string): Promise<{ body: Uint8Array; contentType: string; sizeBytes: number }>;
  headObject(key: string): Promise<StorageObjectMetadata | null>;
  putObject(input: { key: string; body: Uint8Array; contentType: string; metadata: Record<string, string> }): Promise<StorageObjectMetadata>;
  updateReference(input: { file: StorageFileRecord; expectedValue: string; nextValue: string }): Promise<boolean>;
}

export function scanBlobFiles(files: StorageFileRecord[]) {
  return files.filter(file => file.provider === "BLOB");
}

export function planMigration(
  files: StorageFileRecord[],
  options: { resourceId?: string; offset?: number; limit?: number } = {},
): MigrationPlanItem[] {
  const selected = scanBlobFiles(files)
    .filter(file => !options.resourceId || (file.entityType === "Resource" && file.entityId === options.resourceId))
    .sort((a, b) => a.id.localeCompare(b.id));
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.max(0, options.limit ?? selected.length);
  return selected.slice(offset, offset + limit).map(file => {
    const tenantId = file.scope === "school-logo" ? file.schoolId : file.publisherId;
    if (!tenantId) throw new Error(`Missing tenant for ${file.id}.`);
    const fingerprint = createHash("sha256").update(file.value).digest("hex").slice(0, 12);
    const filename = sanitizeUploadFilename(file.filename);
    return {
      id: file.id,
      file,
      sourceUrl: file.value,
      destinationKey: `${uploadPrefixForScope(file.scope)}/${tenantId}/${file.entityId}/${fingerprint}-${filename}`,
    };
  });
}

export async function verifyMigration(
  item: MigrationPlanItem,
  dependencies: Pick<BlobMigrationDependencies, "headObject">,
  expected?: { sizeBytes?: number; contentType?: string },
) {
  const object = await dependencies.headObject(item.destinationKey);
  if (!object) return { ok: false as const, code: "OBJECT_MISSING" as const };
  if (expected?.sizeBytes !== undefined && object.contentLength !== expected.sizeBytes) {
    return { ok: false as const, code: "SIZE_MISMATCH" as const, object };
  }
  if (expected?.contentType && object.contentType?.toLowerCase() !== expected.contentType.toLowerCase()) {
    return { ok: false as const, code: "MIME_MISMATCH" as const, object };
  }
  return { ok: true as const, object };
}

export async function migrateOne(
  item: MigrationPlanItem,
  dependencies: BlobMigrationDependencies,
  options: { dryRun?: boolean } = {},
): Promise<MigrationManifestEntry> {
  const base = {
    id: item.id, entityType: item.file.entityType, entityId: item.file.entityId,
    field: item.file.field, arrayIndex: item.file.arrayIndex, publisherId: item.file.publisherId,
    sourceUrl: item.sourceUrl, destinationKey: item.destinationKey,
  };
  if (options.dryRun) return { ...base, status: "PLANNED", verified: false };
  try {
    const existing = await dependencies.headObject(item.destinationKey);
    let contentType = existing?.contentType;
    let sizeBytes = existing?.contentLength;
    let alreadyMigrated = Boolean(existing);
    if (!existing) {
      const source = await dependencies.fetchSource(item.sourceUrl);
      if (!source.body.byteLength || source.body.byteLength !== source.sizeBytes) {
        return { ...base, status: "FAILED", verified: false, errorCode: "SOURCE_SIZE_INVALID" };
      }
      await dependencies.putObject({
        key: item.destinationKey,
        body: source.body,
        contentType: source.contentType,
        metadata: { migration: "vercel-blob", sourceid: item.id.slice(0, 120) },
      });
      contentType = source.contentType;
      sizeBytes = source.sizeBytes;
      alreadyMigrated = false;
    }
    const verification = await verifyMigration(item, dependencies, { sizeBytes, contentType });
    if (!verification.ok) {
      return { ...base, status: "FAILED", verified: false, errorCode: verification.code, sizeBytes, contentType };
    }
    const updated = await dependencies.updateReference({
      file: item.file,
      expectedValue: item.sourceUrl,
      nextValue: item.destinationKey,
    });
    if (!updated) return { ...base, status: "CONFLICT", verified: true, errorCode: "REFERENCE_CHANGED", sizeBytes, contentType };
    return { ...base, status: alreadyMigrated ? "ALREADY_MIGRATED" : "MIGRATED", verified: true, sizeBytes, contentType };
  } catch {
    return { ...base, status: "FAILED", verified: false, errorCode: "MIGRATION_FAILED" };
  }
}

export async function migrateBatch(
  plan: MigrationPlanItem[],
  dependencies: BlobMigrationDependencies,
  options: { dryRun?: boolean; resume?: readonly MigrationManifestEntry[] } = {},
) {
  const completed = new Set((options.resume ?? [])
    .filter(entry => entry.status === "MIGRATED" || entry.status === "ALREADY_MIGRATED")
    .map(entry => entry.id));
  const entries: MigrationManifestEntry[] = [];
  for (const item of plan) {
    if (completed.has(item.id)) continue;
    entries.push(await migrateOne(item, dependencies, { dryRun: options.dryRun }));
  }
  return entries;
}

export function rollbackManifest(entries: readonly MigrationManifestEntry[]) {
  return [...entries]
    .filter(entry => entry.verified && (entry.status === "MIGRATED" || entry.status === "ALREADY_MIGRATED"))
    .reverse()
    .map(entry => ({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      field: entry.field,
      arrayIndex: entry.arrayIndex,
      expectedValue: entry.destinationKey,
      restoreValue: entry.sourceUrl,
    }));
}
