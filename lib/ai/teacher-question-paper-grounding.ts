import {
  retrieveTeacherSmartBookAiGrounding,
  type TeacherImmutableGrounding,
} from "@/lib/ai/teacher-smart-book-retrieval";

const MAX_PROVIDER_CHUNK_CHARS = 4_000;
const MAX_PROVIDER_TOTAL_CHARS = 80_000;

export type TeacherQuestionPaperProviderChunk = {
  label: string;
  text: string;
};

export type TeacherQuestionPaperGrounding = {
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

  chapters: Array<{
    id: string;
    title: string;
    number: number;
  }>;

  /*
   * Internal immutable grounding retains provenance.
   * This object is server-side and is not the provider projection.
   */
  groundings: TeacherImmutableGrounding[];

  /*
   * Provider-safe projection deliberately excludes:
   * - release IDs
   * - school IDs
   * - academic-year IDs
   * - section IDs
   * - section-subject IDs
   * - subject IDs
   * - book IDs
   * - chapter IDs
   * - block IDs
   * - storage/resource identifiers
   */
  providerChunks: TeacherQuestionPaperProviderChunk[];

  providerText: string;
};

export async function retrieveTeacherQuestionPaperGrounding(input: {
  sectionId: string;
  sectionSubjectId: string;
  bookId: string;
  chapterIds: string[];
}): Promise<TeacherQuestionPaperGrounding | null> {
  const sectionId = input.sectionId.trim();
  const sectionSubjectId = input.sectionSubjectId.trim();
  const bookId = input.bookId.trim();

  const chapterIds = normalizeChapterIds(input.chapterIds);

  if (
    !sectionId ||
    !sectionSubjectId ||
    !bookId ||
    !chapterIds.length
  ) {
    return null;
  }

  const groundings: TeacherImmutableGrounding[] = [];

  /*
   * Resolve each requested chapter independently through the canonical
   * Teacher Smart Book content-delivery boundary.
   *
   * A caller-provided chapter ID is only a claim. Every chapter must
   * successfully resolve through Teacher authorization, entitlement and
   * the exact published V2 Smart Book release.
   */
  for (const chapterId of chapterIds) {
    const grounding =
      await retrieveTeacherSmartBookAiGrounding({
        sectionId,
        sectionSubjectId,
        bookId,
        chapterId,
      });

    /*
     * Fail closed. Partial question-paper grounding is not allowed.
     */
    if (!grounding) {
      return null;
    }

    groundings.push(grounding);
  }

  if (!groundings.length) {
    return null;
  }

  const canonical = groundings[0];

  /*
   * Every chapter in one Question Paper generation must belong to the
   * same exact authorised academic context, book and immutable release.
   *
   * Never silently combine content from different release versions.
   */
  if (
    groundings.some(
      (grounding) =>
        grounding.audience !== "TEACHER" ||
        grounding.release.releaseId !==
          canonical.release.releaseId ||
        grounding.release.releaseVersionId !==
          canonical.release.releaseVersionId ||
        grounding.release.versionNumber !==
          canonical.release.versionNumber ||
        grounding.academic.schoolId !==
          canonical.academic.schoolId ||
        grounding.academic.academicYearId !==
          canonical.academic.academicYearId ||
        grounding.academic.sectionId !==
          canonical.academic.sectionId ||
        grounding.academic.sectionSubjectId !==
          canonical.academic.sectionSubjectId ||
        grounding.academic.subjectId !==
          canonical.academic.subjectId ||
        grounding.book.id !== canonical.book.id
    )
  ) {
    return null;
  }

  /*
   * Recheck the original caller claims against the canonical authorised
   * values returned by content delivery.
   */
  if (
    canonical.academic.sectionId !== sectionId ||
    canonical.academic.sectionSubjectId !==
      sectionSubjectId ||
    canonical.book.id !== bookId
  ) {
    return null;
  }

  const providerChunks =
    buildBoundedProviderProjection(groundings);

  if (!providerChunks.length) {
    return null;
  }

  return {
    audience: "TEACHER",

    release: {
      releaseId: canonical.release.releaseId,
      releaseVersionId:
        canonical.release.releaseVersionId,
      versionNumber: canonical.release.versionNumber,
    },

    academic: {
      schoolId: canonical.academic.schoolId,
      academicYearId:
        canonical.academic.academicYearId,
      sectionId: canonical.academic.sectionId,
      sectionSubjectId:
        canonical.academic.sectionSubjectId,
      subjectId: canonical.academic.subjectId,
    },

    book: {
      id: canonical.book.id,
      title: canonical.book.title,
    },

    chapters: groundings.map((grounding) => ({
      id: grounding.chapter.id,
      title: grounding.chapter.title,
      number: grounding.chapter.number,
    })),

    groundings,

    providerChunks,

    providerText: providerChunks
      .map(
        (chunk) =>
          `${chunk.label}\n${chunk.text}`,
      )
      .join("\n\n")
      .trim(),
  };
}

function normalizeChapterIds(
  chapterIds: string[],
): string[] {
  if (!Array.isArray(chapterIds)) {
    return [];
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of chapterIds) {
    if (typeof value !== "string") {
      return [];
    }

    const chapterId = value.trim();

    if (!chapterId) {
      return [];
    }

    /*
     * Duplicate chapter claims are rejected rather than silently
     * expanding the provider context twice.
     */
    if (seen.has(chapterId)) {
      return [];
    }

    seen.add(chapterId);
    normalized.push(chapterId);
  }

  return normalized;
}

function buildBoundedProviderProjection(
  groundings: TeacherImmutableGrounding[],
): TeacherQuestionPaperProviderChunk[] {
  const providerChunks: TeacherQuestionPaperProviderChunk[] =
    [];

  let remaining = MAX_PROVIDER_TOTAL_CHARS;

  for (const grounding of groundings) {
    for (const chunk of grounding.chunks) {
      if (remaining <= 0) {
        return providerChunks;
      }

      const label = cleanProviderLabel(
        chunk.citation.label,
      );

      const text = cleanProviderText(chunk.text);

      if (!text) {
        continue;
      }

      const boundedText = text.slice(
        0,
        Math.min(
          MAX_PROVIDER_CHUNK_CHARS,
          remaining,
        ),
      );

      if (!boundedText) {
        continue;
      }

      providerChunks.push({
        label:
          label ||
          cleanProviderLabel(
            grounding.chapter.title,
          ) ||
          "Released Smart Book",
        text: boundedText,
      });

      remaining -= boundedText.length;
    }
  }

  return providerChunks;
}

function cleanProviderText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanProviderLabel(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}
