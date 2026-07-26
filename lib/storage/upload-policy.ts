import type { UploadScope, UploadValidation } from "./types";
import { normalizeAndValidateObjectKey } from "./object-key";

const MB = 1024 * 1024;
export const uploadRules: Record<UploadScope, { extensions: string[]; contentTypes: string[]; maxSize: number; prefix: string }> = {
  "book-cover": { extensions: [".jpg", ".jpeg", ".png", ".webp"], contentTypes: ["image/jpeg", "image/png", "image/webp"], maxSize: 5 * MB, prefix: "books/covers" },
  "book-gallery": { extensions: [".jpg", ".jpeg", ".png", ".webp"], contentTypes: ["image/jpeg", "image/png", "image/webp"], maxSize: 5 * MB, prefix: "books/gallery" },
  "book-sample": { extensions: [".pdf"], contentTypes: ["application/pdf"], maxSize: 50 * MB, prefix: "books/samples" },
  "book-public-preview": { extensions: [".pdf"], contentTypes: ["application/pdf"], maxSize: 50 * MB, prefix: "books/public-previews" },
  "book-full": { extensions: [".pdf"], contentTypes: ["application/pdf"], maxSize: 100 * MB, prefix: "books/full-books" },
  "school-logo": { extensions: [".jpg", ".jpeg", ".png", ".webp"], contentTypes: ["image/jpeg", "image/png", "image/webp"], maxSize: 5 * MB, prefix: "schools" },
  "publisher-logo": { extensions: [".jpg", ".jpeg", ".png", ".webp"], contentTypes: ["image/jpeg", "image/png", "image/webp"], maxSize: 5 * MB, prefix: "branding/logo" },
  "publisher-favicon": { extensions: [".jpg", ".jpeg", ".png", ".webp", ".ico"], contentTypes: ["image/jpeg", "image/png", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"], maxSize: 1 * MB, prefix: "branding/favicon" },
  "resource-thumbnail": { extensions: [".jpg", ".jpeg", ".png", ".webp"], contentTypes: ["image/jpeg", "image/png", "image/webp"], maxSize: 5 * MB, prefix: "resources/thumbnails" },
  "resource-file": { extensions: [".pdf", ".ppt", ".pptx", ".doc", ".docx", ".zip", ".mp4", ".webm", ".mov"], contentTypes: ["application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/x-zip-compressed", "video/mp4", "video/webm", "video/quicktime"], maxSize: 100 * MB, prefix: "resources/files" },
  "class-material": { extensions: [".pdf", ".ppt", ".pptx", ".doc", ".docx", ".zip", ".mp4", ".webm", ".mov"], contentTypes: ["application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/x-zip-compressed", "video/mp4", "video/webm", "video/quicktime"], maxSize: 100 * MB, prefix: "classroom/materials" },
  "assignment-attachment": { extensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".ppt", ".pptx", ".doc", ".docx"], contentTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], maxSize: 25 * MB, prefix: "classroom/assignments" },
  "submission-attachment": { extensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".ppt", ".pptx", ".doc", ".docx"], contentTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], maxSize: 25 * MB, prefix: "classroom/submissions" },
};
export function isUploadScope(value: unknown): value is UploadScope { return typeof value === "string" && value in uploadRules; }
export function extensionOf(name: string) { const index = name.lastIndexOf("."); return index >= 0 ? name.slice(index).toLowerCase() : ""; }
export function uploadPrefixForScope(scope: UploadScope) { return uploadRules[scope].prefix; }
export function sanitizeUploadFilename(name: string) { const extension = extensionOf(name), base = name.slice(0, name.length - extension.length).normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "file"; return `${base}${extension}`; }
export function clientUploadPath(scope: UploadScope, name: string) { return `${uploadPrefixForScope(scope)}/${sanitizeUploadFilename(name)}`; }
export function schoolLogoUploadPath(schoolId: string, name: string) { return `schools/${schoolId}/logo/${sanitizeUploadFilename(name)}`; }
/** Server-side Phase 8.0 path builder. Keep legacy paths readable during migration. */
export function publisherUploadPath(publisherId: string, scope: UploadScope, name: string, schoolId?: string) {
  const safePublisher = publisherId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safePublisher) throw new Error("A valid publisher context is required.");
  if (scope === "school-logo") {
    const safeSchool = schoolId?.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeSchool) throw new Error("A valid school context is required.");
    return `publishers/${safePublisher}/schools/${safeSchool}/logo/${sanitizeUploadFilename(name)}`;
  }
  return `publishers/${safePublisher}/${uploadPrefixForScope(scope)}/${sanitizeUploadFilename(name)}`;
}
export function isPublisherUploadUrl(value: string | null | undefined, publisherId: string, scopes: UploadScope[]) {
  if (!value) return true;
  try {
    const parsed = new URL(value), safePublisher = publisherId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".public.blob.vercel-storage.com") || !safePublisher) return false;
    return scopes.some(scope => parsed.pathname.startsWith(`/publishers/${safePublisher}/${uploadRules[scope].prefix}/`));
  } catch { return false; }
}
export function isPublisherStorageValue(value: string | null | undefined, publisherId: string, scopes: UploadScope[]) {
  if (!value) return true;
  if (isPublisherUploadUrl(value, publisherId, scopes)) return true;
  try {
    const key = normalizeAndValidateObjectKey(value);
    return scopes.some(scope => key.startsWith(`${uploadRules[scope].prefix}/${publisherId}/`));
  } catch {
    return false;
  }
}
export function isValidUploadPath(scope: UploadScope, name: string, pathname: string) { return pathname === clientUploadPath(scope, name) && !pathname.includes("..") && !pathname.includes("\\"); }
export function validateDirectUpload(file: File, scope: unknown): UploadValidation {
  if (!isUploadScope(scope)) return { ok: false, code: "INVALID_SCOPE", message: "The upload type is not supported." };
  if (!file.size) return { ok: false, code: "EMPTY_FILE", message: "Choose a non-empty file." };
  const rule = uploadRules[scope], extension = extensionOf(file.name);
  if (!rule.extensions.includes(extension) || !rule.contentTypes.includes(file.type.toLowerCase())) return { ok: false, code: "INVALID_FILE_TYPE", message: `This file type is not allowed. Accepted: ${rule.extensions.join(", ")}.` };
  if (file.size > rule.maxSize) return { ok: false, code: "FILE_TOO_LARGE", message: `The file must be smaller than ${Math.round(rule.maxSize / MB)} MB.` };
  return { ok: true, code: "VALID", message: "Valid", extension, contentType: file.type, maxSize: rule.maxSize, objectPrefix: rule.prefix };
}
