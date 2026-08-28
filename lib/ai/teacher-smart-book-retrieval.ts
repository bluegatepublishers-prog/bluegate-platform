import {
  loadTeacherChapterStructuredContent,
} from "@/lib/content-delivery";
import {
  extractSmartBookAiDocument,
} from "@/lib/ai/smart-book-retrieval";

export type TeacherImmutableGroundingCitation = {
  sourceType: "SMART_BOOK_RELEASE";
  releaseVersionId: string;
  bookId: string;
  chapterId: string;
  moduleId: string;
  moduleTitle: string;
  blockId: string;
  blockType: string;
  label: string;
};

export type TeacherImmutableGrounding = {
  audience: "TEACHER";

  release: {
    releaseId: string;
    releaseVersionId: string;
    versionNumber: number;
  };

  academic: {
    schoolId: string;
    academicYearId: string;
    sectionId: string;
    sectionSubjectId: string;
    subjectId: string;
  };

  book: {
    id: string;
    title: string;
  };

  chapter: {
    id: string;
    title: string;
    number: number;
  };

  chunks: Array<{
    id: string;
    text: string;
    citation: TeacherImmutableGroundingCitation;
  }>;

  text: string;
};

export async function retrieveTeacherSmartBookAiGrounding(input: {
  sectionId: string;
  sectionSubjectId: string;
  bookId: string;
  chapterId: string;
  moduleId?: string | null;
}): Promise<TeacherImmutableGrounding | null> {
  const sectionId = input.sectionId.trim();
  const sectionSubjectId = input.sectionSubjectId.trim();
  const bookId = input.bookId.trim();
  const chapterId = input.chapterId.trim();
  const moduleId = input.moduleId?.trim() || undefined;

  if (
    !sectionId ||
    !sectionSubjectId ||
    !bookId ||
    !chapterId
  ) {
    return null;
  }

  /*
   * Authorization + immutable release boundary.
   *
   * loadTeacherChapterStructuredContent() is the canonical Teacher
   * content-delivery boundary. It verifies the authenticated Teacher's
   * section/subject assignment, verifies the book entitlement for that
   * academic context, resolves the exact published V2 Smart Book release
   * and returns TEACHER-mode immutable content.
   *
   * Do not replace this with direct mutable Book, BookChapter,
   * BookQuestion or current authoring-state queries.
   */
  const structured = await loadTeacherChapterStructuredContent({
    sectionId,
    sectionSubjectId,
    chapterId,
    moduleId,
    bookId,
  });

  if (!structured) {
    return null;
  }

  /*
   * Treat caller-provided identifiers as claims only.
   * The canonical values returned by the authorised content-delivery
   * boundary must agree with those claims before grounding is created.
   */
  if (
    structured.bookId !== bookId ||
    structured.chapter.id !== chapterId
  ) {
    return null;
  }

  const scope = structured.scope;
  const subject = structured.subject;

  const schoolId = readRequiredString(scope, "schoolId");
  const academicYearId = readRequiredString(
    scope,
    "academicYearId",
  );
  const resolvedSectionId = readRequiredString(
    scope,
    "sectionId",
  );
  const resolvedSectionSubjectId =
    readRequiredString(subject, "id");
  const subjectId = readRequiredString(subject, "subjectId");

  if (
    !schoolId ||
    !academicYearId ||
    !resolvedSectionId ||
    !resolvedSectionSubjectId ||
    !subjectId
  ) {
    return null;
  }

  if (
    resolvedSectionId !== sectionId ||
    resolvedSectionSubjectId !== sectionSubjectId
  ) {
    return null;
  }

  const bookTitle =
    readRequiredString(subject, "bookTitle") ||
    readNestedBookTitle(subject) ||
    "Released Smart Book";

  const chapterTitle =
    typeof structured.chapter.title === "string"
      ? structured.chapter.title.trim()
      : "";

  const chapterNumber =
    typeof structured.chapter.chapterNumber === "number"
      ? structured.chapter.chapterNumber
      : 0;

  const chunks: TeacherImmutableGrounding["chunks"] = [];

  for (const item of structured.items) {
    if (!item.immutableRelease) {
      continue;
    }

    const extracted = extractSmartBookAiDocument(
      item.document,
      "TEACHER",
    );

    for (const chunk of extracted.chunks) {
      const citation: TeacherImmutableGroundingCitation = {
        sourceType: "SMART_BOOK_RELEASE",
        releaseVersionId:
          structured.release.releaseVersionId,
        bookId,
        chapterId,
        moduleId: item.id,
        moduleTitle: item.title,
        blockId: chunk.blockId,
        blockType: chunk.blockType,
        label: buildTeacherSourceLabel(
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
    audience: "TEACHER",

    release: {
      releaseId: structured.release.releaseId,
      releaseVersionId:
        structured.release.releaseVersionId,
      versionNumber: structured.release.versionNumber,
    },

    academic: {
      schoolId,
      academicYearId,
      sectionId: resolvedSectionId,
      sectionSubjectId: resolvedSectionSubjectId,
      subjectId,
    },

    book: {
      id: bookId,
      title: bookTitle,
    },

    chapter: {
      id: chapterId,
      title: chapterTitle,
      number: chapterNumber,
    },

    chunks,

    text: chunks
      .map((chunk) => chunk.text)
      .join("\n\n")
      .trim(),
  };
}

function buildTeacherSourceLabel(
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

function readRequiredString(
  value: unknown,
  key: string,
): string {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return "";
  }

  const candidate = (
    value as Record<string, unknown>
  )[key];

  return typeof candidate === "string"
    ? candidate.trim()
    : "";
}

function readNestedBookTitle(value: unknown): string {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return "";
  }

  const book = (
    value as Record<string, unknown>
  ).book;

  if (
    !book ||
    typeof book !== "object" ||
    Array.isArray(book)
  ) {
    return "";
  }

  const title = (
    book as Record<string, unknown>
  ).title;

  return typeof title === "string"
    ? title.trim()
    : "";
}
