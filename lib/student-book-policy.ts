import type { StudentSubjectViewModel } from "@/lib/student-subject-policy";
import { readingProgressPercent } from "@/lib/student-reading-policy";
import { bookCoverPath } from "@/lib/storage/book-asset-path";

export interface StudentBookProgressRow {
  bookId: string;
  lastPage: number;
  totalPages: number | null;
  completedAt: Date | null;
  lastReadAt: Date;
}

export function buildStudentBookLibrary(
  subjects: readonly StudentSubjectViewModel[],
  progress: readonly StudentBookProgressRow[],
) {
  const unique = new Map<string, {
    id: string;
    title: string;
    coverImage: string | null;
    series: string | null;
    className: string;
    subjectName: string;
    sectionSubjectId: string;
  }>();

  for (const subject of subjects) {
    if (!subject.book || unique.has(subject.book.id)) continue;
    unique.set(subject.book.id, {
      id: subject.book.id,
      title: subject.book.title,
      coverImage: bookCoverPath(subject.book.id, subject.book.coverImage),
      series: subject.book.series,
      className: subject.book.className,
      subjectName: subject.subjectName,
      sectionSubjectId: subject.sectionSubjectId,
    });
  }

  return [...unique.values()].map((book) => {
    const item = progress.find((row) => row.bookId === book.id);
    return {
      ...book,
      progress: item ? {
        lastPage: item.lastPage,
        totalPages: item.totalPages,
        percent: readingProgressPercent(item.lastPage, item.totalPages),
        completed: Boolean(item.completedAt),
        lastReadAt: item.lastReadAt.toISOString(),
      } : null,
    };
  });
}
