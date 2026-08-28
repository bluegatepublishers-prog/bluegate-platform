import {
  loadStudentChapterStructuredContent,
} from "@/lib/content-delivery";
import {
  extractSmartBookAiDocument,
} from "@/lib/ai/smart-book-retrieval";
import type {
  StudentImmutableGrounding,
  StudentImmutableGroundingCitation,
} from "@/lib/ai/types";

export async function retrieveStudentSmartBookAiGrounding(input: {
  sectionSubjectId: string;
  chapterId: string;
  moduleId?: string | null;
}): Promise<StudentImmutableGrounding | null> {
  const sectionSubjectId = input.sectionSubjectId.trim();
  const chapterId = input.chapterId.trim();
  const moduleId = input.moduleId?.trim() || undefined;

  if (!sectionSubjectId || !chapterId) {
    return null;
  }

  /*
   * Authorization + immutable release boundary.
   *
   * The existing content-delivery service resolves the authenticated
   * Student workspace, verifies the Student's subject/book context,
   * resolves the published V2 Smart Book release and applies
   * STUDENT-safe content projection.
   *
   * Do not replace this with direct mutable BookChapter, BookQuestion
   * or authoring-state queries.
   */
  const structured = await loadStudentChapterStructuredContent(
    sectionSubjectId,
    chapterId,
    moduleId,
  );

  if (!structured?.workspace.subject.book) {
    return null;
  }

  const book = structured.workspace.subject.book;

  /*
   * These workspace chapter values are context/display metadata only.
   * Educational grounding below comes exclusively from immutable
   * release-derived item.document values.
   */
  const chapterTitle = structured.workspace.chapter.title;
  const chapterNumber = structured.workspace.chapter.chapterNumber;

  const chunks: StudentImmutableGrounding["chunks"] = [];

  for (const item of structured.items) {
    if (!item.immutableRelease) {
      continue;
    }

    const extracted = extractSmartBookAiDocument(
      item.document,
      "STUDENT",
    );

    for (const chunk of extracted.chunks) {
      const citation: StudentImmutableGroundingCitation = {
        sourceType: "SMART_BOOK_RELEASE",
        releaseVersionId: structured.release.releaseVersionId,
        bookId: book.id,
        chapterId,
        moduleId: item.id,
        moduleTitle: item.title,
        blockId: chunk.blockId,
        blockType: chunk.blockType,
        label: buildStudentSourceLabel(
          chapterTitle,
          item.title,
        ),
      };

      chunks.push({
        id: `${structured.release.releaseVersionId}:${item.id}:${chunk.id}`,
        text: chunk.text,
        citation,
      });
    }
  }

  if (!chunks.length) {
    return null;
  }

  return {
    audience: "STUDENT",

    release: {
      releaseId: structured.release.releaseId,
      releaseVersionId: structured.release.releaseVersionId,
      versionNumber: structured.release.versionNumber,
    },

    book: {
      id: book.id,
      title: book.title,
    },

    chapter: {
      id: chapterId,
      title: chapterTitle,
      number: chapterNumber,
    },

    sectionSubjectId,
    chunks,

    text: chunks
      .map((chunk) => chunk.text)
      .join("\n\n")
      .trim(),
  };
}

function buildStudentSourceLabel(
  chapterTitle: string,
  moduleTitle: string,
): string {
  const chapter = chapterTitle.trim();
  const module = moduleTitle.trim();

  if (chapter && module) {
    return `${chapter} - ${module}`;
  }

  return chapter || module || "Released Smart Book";
}
