import type { SmartBookContentsNode } from "@/lib/smart-book-contents";

export type StudentAskMyBookChapter = {
  chapterId: string;
  title: string;
  startPage: number;
};

/**
 * Resolve the released chapter that owns an absolute PDF page.
 *
 * The input hierarchy is already derived from the authorised immutable
 * Smart Book release. This helper performs no database lookup and does
 * not accept a client-provided chapter claim.
 *
 * Pages before the first released chapter deliberately return null.
 */
export function resolveStudentAskMyBookChapter(
  contents: readonly SmartBookContentsNode[],
  page: number,
): StudentAskMyBookChapter | null {
  if (!Number.isInteger(page) || page < 1) {
    return null;
  }

  const chapters = collectReleasedChapters(contents)
    .filter(
      (
        chapter,
      ): chapter is StudentAskMyBookChapter =>
        typeof chapter.chapterId === "string" &&
        Boolean(chapter.chapterId.trim()) &&
        Number.isInteger(chapter.startPage) &&
        chapter.startPage >= 1,
    )
    .sort((left, right) => {
      if (left.startPage !== right.startPage) {
        return left.startPage - right.startPage;
      }

      return left.chapterId.localeCompare(
        right.chapterId,
      );
    });

  let current: StudentAskMyBookChapter | null =
    null;

  for (const chapter of chapters) {
    if (chapter.startPage > page) {
      break;
    }

    current = chapter;
  }

  return current;
}

export function buildStudentAskMyBookHref(
  bookId: string,
  chapterId: string,
) {
  const safeBookId = bookId.trim();
  const safeChapterId = chapterId.trim();

  if (!safeBookId || !safeChapterId) {
    return null;
  }

  return `/student-dashboard/books/${encodeURIComponent(
    safeBookId,
  )}/chapters/${encodeURIComponent(
    safeChapterId,
  )}/assistant`;
}

function collectReleasedChapters(
  nodes: readonly SmartBookContentsNode[],
): StudentAskMyBookChapter[] {
  const chapters: StudentAskMyBookChapter[] = [];

  for (const node of nodes) {
    if (
      node.kind === "CHAPTER" &&
      typeof node.startPage === "number" &&
      Number.isInteger(node.startPage) &&
      node.startPage >= 1
    ) {
      chapters.push({
        chapterId: node.id,
        title: node.title,
        startPage: node.startPage,
      });
    }

    if (node.children?.length) {
      chapters.push(
        ...collectReleasedChapters(
          node.children,
        ),
      );
    }
  }

  return chapters;
}
