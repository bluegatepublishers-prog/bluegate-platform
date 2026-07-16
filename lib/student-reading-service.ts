import { validateBookmarkPage, validateReadingPosition } from "@/lib/student-reading-policy";

export interface TrustedReadingContext {
  studentId: string;
  academicYearId: string;
}

export async function saveReadingProgressWithDependencies<T>(
  input: { bookId: string; currentPage: unknown; totalPages: unknown },
  dependencies: {
    getContext(): Promise<TrustedReadingContext>;
    authorizeBook(bookId: string, context: TrustedReadingContext): Promise<boolean>;
    upsert(data: {
      studentId: string;
      bookId: string;
      academicYearId: string;
      lastPage: number;
      totalPages: number | null;
      completed: boolean;
    }): Promise<T>;
  },
) {
  const position = validateReadingPosition(input.currentPage, input.totalPages);
  if (!position.ok) return { ok: false as const, message: position.message };
  const context = await dependencies.getContext();
  if (!(await dependencies.authorizeBook(input.bookId, context))) {
    return { ok: false as const, message: "This book is not available for your account." };
  }
  const value = await dependencies.upsert({
    ...context,
    bookId: input.bookId,
    lastPage: position.lastPage,
    totalPages: position.totalPages,
    completed: position.completed,
  });
  return { ok: true as const, value };
}

export async function togglePageBookmarkWithDependencies<T>(
  input: { bookId: string; pageNumber: unknown; totalPages?: number | null },
  dependencies: {
    getContext(): Promise<TrustedReadingContext>;
    authorizeBook(bookId: string, context: TrustedReadingContext): Promise<boolean>;
    toggle(data: { studentId: string; bookId: string; academicYearId: string; pageNumber: number }): Promise<T>;
  },
) {
  const pageNumber = validateBookmarkPage(input.pageNumber, input.totalPages);
  if (!pageNumber) return { ok: false as const, message: "We could not save this page bookmark." };
  const context = await dependencies.getContext();
  if (!(await dependencies.authorizeBook(input.bookId, context))) {
    return { ok: false as const, message: "This book is not available for your account." };
  }
  return { ok: true as const, value: await dependencies.toggle({ ...context, bookId: input.bookId, pageNumber }) };
}
