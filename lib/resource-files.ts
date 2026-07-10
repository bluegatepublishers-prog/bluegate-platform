import { unlink } from "fs/promises";
import path from "path";

export async function removeManagedResourceFile(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/resources/")) return;

  const publicRoot = path.resolve(process.cwd(), "public");
  const filePath = path.resolve(publicRoot, url.replace(/^\/+/, ""));
  const resourceRoot = path.resolve(publicRoot, "uploads", "resources");
  if (!filePath.startsWith(`${resourceRoot}${path.sep}`)) return;

  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Managed resource file cleanup failed:", error);
    }
  }
}
