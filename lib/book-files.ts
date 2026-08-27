import "server-only";
import { deleteFile, deleteStoredObject, isManagedFileUrl } from "@/lib/storage";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { isObjectKeyProtectedByRelease } from "@/lib/release-asset-retention";
export function isManagedBookFile(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!isManagedFileUrl(value)) return false;
  if (value.startsWith("/uploads/books/")) return true;
  try {
    return /^\/(?:publishers\/[^/]+\/)?books\//.test(new URL(value).pathname);
  } catch {
    return false;
  }
}
export async function removeManagedBookFiles(
  values: Array<string | null | undefined>,
  options?: { publisherId?: string; protectedObjectKeys?: Iterable<string> },
) {
  const protectedObjectKeys = new Set([...options?.protectedObjectKeys ?? []].map((value) => {
    try { return normalizeAndValidateObjectKey(value); } catch { return value; }
  }));
  const unique = [...new Set(values.filter((v): v is string => !!v && !protectedObjectKeys.has(v)))];
  const results = await Promise.allSettled(unique.map(async (value) => {
    if (protectedObjectKeys.has(value)) return;
    let key: string | null = null;
    try { key = normalizeAndValidateObjectKey(value); } catch { /* legacy URL */ }
    if (key && options?.publisherId && isManagedBookStorageKey(key, options.publisherId)) {
      if (await isObjectKeyProtectedByRelease({ publisherId: options.publisherId, objectKey: key })) return;
      await deleteStoredObject({ key });
      return;
    }
    if (isManagedBookFile(value)) await deleteFile(value);
  }));
  if (results.some(result => result.status === "rejected"))
    console.warn("Managed book file cleanup was incomplete", { count: results.filter(result => result.status === "rejected").length });
}

function isManagedBookStorageKey(key: string, publisherId: string) {
  return ["book-cover", "book-gallery", "book-sample", "book-public-preview", "book-full"]
    .some((scope) => key.startsWith(`${uploadPrefixForScope(scope as never)}/${publisherId}/`));
}
