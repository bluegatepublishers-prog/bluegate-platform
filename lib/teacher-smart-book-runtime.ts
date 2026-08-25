import "server-only";

import { loadSmartBookStructuredContent } from "@/lib/content-delivery";
import { getSmartBookContents } from "@/lib/smart-book-reader";
import type { getTeacherBook } from "@/lib/teacher-books";

export type TeacherSmartBook = NonNullable<Awaited<ReturnType<typeof getTeacherBook>>>;

export async function loadTeacherSmartBookRuntime(book: TeacherSmartBook) {
  const [contents, content] = await Promise.all([
    getSmartBookContents(book.id),
    loadSmartBookStructuredContent({
      publisherId: book.publisherId,
      bookId: book.id,
      mode: "TEACHER",
      requirePublishedRelease: true,
    }),
  ]);

  return { contents, content };
}
