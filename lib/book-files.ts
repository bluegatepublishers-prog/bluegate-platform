import { unlink } from "node:fs/promises";
import path from "node:path";

const BOOK_UPLOAD_PREFIX = "/uploads/books/";

export function isManagedBookFile(value: string | null | undefined): value is string {
  return Boolean(value?.startsWith(BOOK_UPLOAD_PREFIX));
}

export async function removeManagedBookFiles(values: Array<string | null | undefined>) {
  const publicRoot = path.resolve(process.cwd(), "public");

  await Promise.allSettled(
    [...new Set(values.filter(isManagedBookFile))].map(async (value) => {
      const target = path.resolve(publicRoot, value.slice(1));
      if (!target.startsWith(`${publicRoot}${path.sep}`)) return;

      try {
        await unlink(target);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    })
  );
}
