import "server-only";

import { loadSmartBookStructuredContent } from "@/lib/content-delivery";
import { getSmartBookContents } from "@/lib/smart-book-reader";
import { resolvePublishedSmartBookContent } from "@/lib/smart-book-release-runtime";
import type { getTeacherBook } from "@/lib/teacher-books";

export type TeacherSmartBook = NonNullable<Awaited<ReturnType<typeof getTeacherBook>>>;

export async function loadTeacherSmartBookRuntime(book: TeacherSmartBook) {
  const release = await resolvePublishedSmartBookContent({ publisherId: book.publisherId, bookId: book.id });
  if (!release) return { contents: [], content: null };
  const [contents, content] = await Promise.all([
    getSmartBookContents(book.id, { manifest: release.manifest }),
    loadSmartBookStructuredContent({
      publisherId: book.publisherId,
      bookId: book.id,
      mode: "TEACHER",
      requirePublishedRelease: true,
      publishedContent: release,
    }),
  ]);

  return { contents, content };
}
