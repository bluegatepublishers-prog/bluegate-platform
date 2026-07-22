import type { StorageObjectMetadata } from "./types";
import type { StorageFileRecord } from "./storage-records";
import { normalizeAndValidateObjectKey } from "./object-key";
import { uploadRules } from "./upload-policy";

export type StorageHealthIssueType =
  | "MISSING_OBJECT" | "ORPHAN_OBJECT" | "BROKEN_METADATA" | "DUPLICATE_OBJECT"
  | "INVALID_OBJECT_KEY" | "INVALID_MIME" | "INVALID_SIZE";

export interface StorageHealthIssue {
  type: StorageHealthIssueType;
  severity: "ERROR" | "WARNING";
  fileId?: string;
  objectKey?: string;
  message: string;
}

export function generateStorageHealthReport(
  files: readonly StorageFileRecord[],
  objects: readonly StorageObjectMetadata[],
) {
  const issues: StorageHealthIssue[] = [];
  const objectMap = new Map(objects.map(object => [object.key, object]));
  const references = new Map<string, StorageFileRecord[]>();
  for (const file of files) {
    if (file.provider === "R2") {
      const list = references.get(file.value) ?? [];
      list.push(file);
      references.set(file.value, list);
      try {
        const key = normalizeAndValidateObjectKey(file.value);
        const tenantId = file.scope === "school-logo" ? file.schoolId : file.publisherId;
        if (!tenantId || !key.startsWith(`${uploadRules[file.scope].prefix}/${tenantId}/`)) throw new Error();
      } catch {
        issues.push({ type: "INVALID_OBJECT_KEY", severity: "ERROR", fileId: file.id, message: "Stored object key is outside its tenant and category namespace." });
      }
      const object = objectMap.get(file.value);
      if (!object) issues.push({ type: "MISSING_OBJECT", severity: "ERROR", fileId: file.id, objectKey: file.value, message: "Database metadata points to an object that was not found." });
      if (!file.storedMimeType || file.sizeBytes === null) issues.push({ type: "BROKEN_METADATA", severity: "WARNING", fileId: file.id, message: "Filename, MIME type, or size metadata is incomplete." });
      const allowedMimes = uploadRules[file.scope].contentTypes;
      const mime = object?.contentType?.toLowerCase() || file.mimeType?.toLowerCase();
      if (mime && !allowedMimes.includes(mime)) issues.push({ type: "INVALID_MIME", severity: "ERROR", fileId: file.id, message: "Stored MIME type is not allowed for this file category." });
      const size = object?.contentLength ?? file.sizeBytes;
      if (size !== null && size !== undefined && (size <= 0 || size > uploadRules[file.scope].maxSize)) issues.push({ type: "INVALID_SIZE", severity: "ERROR", fileId: file.id, message: "Stored size is empty or exceeds the category limit." });
    } else if (file.provider === "INVALID") {
      issues.push({ type: "INVALID_OBJECT_KEY", severity: "ERROR", fileId: file.id, message: "Stored file value is not a supported URL or object key." });
    }
  }
  for (const [key, linked] of references) {
    if (linked.length > 1) issues.push({ type: "DUPLICATE_OBJECT", severity: "WARNING", objectKey: key, message: `${linked.length} database fields reference the same object.` });
  }
  for (const object of objects) {
    if (!references.has(object.key)) issues.push({ type: "ORPHAN_OBJECT", severity: "WARNING", objectKey: object.key, message: "R2 object has no matching database reference." });
  }
  return {
    generatedAt: new Date().toISOString(),
    filesChecked: files.length,
    objectsChecked: objects.length,
    healthy: issues.every(issue => issue.severity !== "ERROR"),
    counts: issues.reduce<Record<StorageHealthIssueType, number>>((counts, issue) => {
      counts[issue.type] += 1;
      return counts;
    }, { MISSING_OBJECT: 0, ORPHAN_OBJECT: 0, BROKEN_METADATA: 0, DUPLICATE_OBJECT: 0, INVALID_OBJECT_KEY: 0, INVALID_MIME: 0, INVALID_SIZE: 0 }),
    issues,
  };
}
