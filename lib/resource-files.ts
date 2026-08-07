import "server-only";
import { deleteFile, deleteStoredObject, isManagedFileUrl } from "@/lib/storage";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
export async function removeManagedResourceFile(url: string | null | undefined) {
  if (!url) return;
  try {
    if (isManagedFileUrl(url) && isResourceUrl(url)) {
      await deleteFile(url);
      return;
    }

    const key = normalizeAndValidateObjectKey(url);
    if (key.startsWith("resources/files/") || key.startsWith("resources/thumbnails/")) {
      await deleteStoredObject({ key });
    }
  } catch {
    console.warn("Managed resource file cleanup failed", { code: "DELETE_FAILED" });
  }
}
function isResourceUrl(url: string) {
  if (url.startsWith("/uploads/resources/")) return true;
  try {
    return /^\/(?:publishers\/[^/]+\/)?resources\//.test(new URL(url).pathname);
  } catch {
    return false;
  }
}
