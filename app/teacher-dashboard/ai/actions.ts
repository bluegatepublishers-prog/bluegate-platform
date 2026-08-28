"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { executeAiGeneration } from "@/lib/ai";
import {
  SAFE_ENTITLEMENT_MESSAGES,
} from "@/lib/entitlements";
import { requireBookEntitlement } from "@/lib/entitlements/book";
import { requireTeacherSubject } from "@/lib/teacher-experience";
import { resolvePublishedSmartBookContent } from "@/lib/smart-book-release-runtime";

const templatesPath = "/teacher-dashboard/ai/templates";

const clean = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function savePromptTemplate(
  formData: FormData,
) {
  const teacher = await requireTeacher();
  const id = clean(formData, "id");
  const title = clean(formData, "title");
  const tool = clean(formData, "tool");
  const prompt = clean(formData, "prompt");
  const description =
    clean(formData, "description") || null;

  if (!title || !tool || !prompt) {
    return {
      ok: false,
      message:
        "Title, tool, and prompt are required.",
    };
  }

  if (
    title.length > 120 ||
    tool.length > 80 ||
    prompt.length > 5000 ||
    (description?.length ?? 0) > 300
  ) {
    return {
      ok: false,
      message:
        "One or more fields exceed the allowed length.",
    };
  }

  if (id) {
    const result =
      await prisma.promptTemplate.updateMany({
        where: {
          id,
          teacherId: teacher.id,
        },
        data: {
          title,
          tool,
          prompt,
          description,
        },
      });

    if (!result.count) {
      return {
        ok: false,
        message: "Template not found.",
      };
    }
  } else {
    await prisma.promptTemplate.create({
      data: {
        teacherId: teacher.id,
        title,
        tool,
        prompt,
        description,
      },
    });
  }

  revalidatePath(templatesPath);

  return {
    ok: true,
    message: id
      ? "Template updated."
      : "Template created.",
  };
}

export async function deletePromptTemplate(
  id: string,
) {
  const teacher = await requireTeacher();

  await prisma.promptTemplate.deleteMany({
    where: {
      id,
      teacherId: teacher.id,
    },
  });

  revalidatePath(templatesPath);

  return { ok: true };
}

export async function saveBuilderDraft(input: {
  tool: "Worksheet Builder";
  title: string;
  configuration: string;
}) {
  const teacher = await requireTeacher();
  const title = input.title.trim();

  if (!title || title.length > 160) {
    return {
      ok: false,
      message: "Enter a valid title.",
    };
  }

  if (
    input.tool !== "Worksheet Builder" ||
    !input.configuration ||
    input.configuration.length > 50000
  ) {
    return {
      ok: false,
      message:
        "The builder configuration is invalid or too large.",
    };
  }

  let configuration: Record<string, unknown>;

  try {
    const parsed: unknown = JSON.parse(
      input.configuration,
    );

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error();
    }

    configuration =
      parsed as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      message:
        "The builder configuration is invalid.",
    };
  }

  const generation =
    await prisma.aiGeneration.create({
      data: {
        teacherId: teacher.id,
        tool: "Worksheet Builder",
        title,
        prompt: JSON.stringify(configuration),
        status: "DRAFT",
      },
    });

  revalidatePath(
    "/teacher-dashboard/ai/history",
  );

  return {
    ok: true,
    id: generation.id,
    previewUrl: `/teacher-dashboard/ai/generations/${generation.id}`,
    message:
      "Draft orchestration preview saved. No external AI provider was called.",
  };
}

export async function updateGenerationDraft(
  id: string,
  formData: FormData,
) {
  const teacher = await requireTeacher();

  const editableContent = String(
    formData.get("editableContent") ?? "",
  ).trim();

  if (editableContent.length > 100000) {
    return {
      ok: false,
      message: "Draft content is too large.",
    };
  }

  const existing =
    await prisma.aiGeneration.findFirst({
      where: {
        id,
        teacherId: teacher.id,
      },
      select: {
        output: true,
        status: true,
      },
    });

  if (!existing) {
    return {
      ok: false,
      message: "Generation not found.",
    };
  }

  let envelope: Record<string, unknown> = {};

  try {
    const parsed: unknown = JSON.parse(
      existing.output ?? "{}",
    );

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      envelope =
        parsed as Record<string, unknown>;
    }
  } catch {
    // Preserve an empty editable envelope.
  }

  envelope.editableContent =
    editableContent;

  await prisma.aiGeneration.update({
    where: { id },
    data: {
      output: JSON.stringify(
        envelope,
        null,
        2,
      ),
      status: existing.status,
    },
  });

  revalidatePath(
    `/teacher-dashboard/ai/generations/${id}`,
  );
  revalidatePath(
    "/teacher-dashboard/ai/history",
  );

  return {
    ok: true,
    message: "Editable draft saved.",
  };
}

type GenerateQuestionPaperInput = {
  generationId: string;

  /*
   * Browser-submitted academic context claims.
   * Batch C must re-authorise these on the server
   * before immutable Teacher grounding is prepared.
   */
  sectionId: string;
  sectionSubjectId: string;

  bookId: string;
  chapterIds: string[];
  coverage: "whole" | "selected";
  examType: string;
  pattern: string;
  title: string;
  totalMarks: number;
  duration: number;
  difficulty:
    | "Easy"
    | "Balanced"
    | "Advanced";
  autoDistribution: boolean;
  questionTypes: string[];
  questionCounts: Record<string, number>;
  estimatedQuestions: number;
  advanced: {
    bloomDistribution: boolean;
    internalChoices: boolean;
    caseBasedQuestions: boolean;
    competencyPercent: number;
    creativeQuestions: boolean;
    applicationQuestions: boolean;
  };
};

const allowedQuestionTypes = new Set([
  "MCQ",
  "Very Short",
  "Short",
  "Long",
  "Case Study",
  "Assertion Reason",
  "Competency Based",
  "HOTS",
]);

const allowedExamTypes = new Set([
  "Class Test",
  "Unit Test",
  "Periodic Test",
  "Half Yearly",
  "Annual Examination",
  "Practice Paper",
  "Competency Assessment",
  "Olympiad",
  "Custom",
]);

const allowedPatterns = new Set([
  "CBSE Pattern",
  "School Pattern",
  "Bluegate Pattern",
  "Custom",
]);

export async function generateQuestionPaper(
  input: GenerateQuestionPaperInput,
) {
  const teacher = await requireTeacher();

  if (
    !input ||
    typeof input.generationId !== "string" ||
    !/^[a-zA-Z0-9_-]{16,64}$/.test(
      input.generationId,
    ) ||
    typeof input.sectionId !== "string" ||
    !input.sectionId.trim() ||
    typeof input.sectionSubjectId !==
      "string" ||
    !input.sectionSubjectId.trim() ||
    typeof input.bookId !== "string" ||
    !input.bookId.trim() ||
    !["whole", "selected"].includes(
      input.coverage,
    ) ||
    !Array.isArray(input.chapterIds) ||
    (input.coverage === "selected" &&
      !input.chapterIds.length) ||
    input.chapterIds.some(
      (id) =>
        typeof id !== "string" ||
        !id.trim(),
    ) ||
    new Set(input.chapterIds).size !==
      input.chapterIds.length ||
    !allowedExamTypes.has(input.examType) ||
    !allowedPatterns.has(input.pattern) ||
    typeof input.title !== "string" ||
    !input.title.trim() ||
    input.title.length > 160 ||
    !Number.isInteger(input.totalMarks) ||
    input.totalMarks < 1 ||
    input.totalMarks > 500 ||
    !Number.isInteger(input.duration) ||
    input.duration < 10 ||
    input.duration > 360 ||
    ![
      "Easy",
      "Balanced",
      "Advanced",
    ].includes(input.difficulty) ||
    typeof input.autoDistribution !==
      "boolean" ||
    !Array.isArray(input.questionTypes) ||
    !input.questionTypes.length ||
    new Set(input.questionTypes).size !==
      input.questionTypes.length ||
    input.questionTypes.some(
      (type) =>
        !allowedQuestionTypes.has(type),
    ) ||
    !input.advanced ||
    [
      input.advanced.bloomDistribution,
      input.advanced.internalChoices,
      input.advanced.caseBasedQuestions,
      input.advanced.creativeQuestions,
      input.advanced.applicationQuestions,
    ].some(
      (value) =>
        typeof value !== "boolean",
    ) ||
    !Number.isInteger(
      input.advanced.competencyPercent,
    ) ||
    input.advanced.competencyPercent < 0 ||
    input.advanced.competencyPercent > 100
  ) {
    return {
      ok: false as const,
      message:
        "Please complete all question paper settings.",
    };
  }

  const sectionId = input.sectionId.trim();
  const sectionSubjectId =
    input.sectionSubjectId.trim();
  const bookId = input.bookId.trim();
  const uniqueChapterIds = input.chapterIds.map(
    (id) => id.trim(),
  );

  try {
    /*
     * Canonical Teacher authorization boundary.
     *
     * Browser IDs are claims only. The server resolves the
     * Teacher's current class/subject assignment and then
     * verifies that the selected SectionSubject owns the Book.
     */
    const { scope, subject } =
      await requireTeacherSubject(
        sectionId,
        sectionSubjectId,
      );

    if (
      scope.teacher.id !== teacher.id ||
      scope.section.id !== sectionId ||
      subject.id !== sectionSubjectId ||
      !subject.book ||
      subject.book.id !== bookId
    ) {
      return {
        ok: false as const,
        message:
          "The selected teaching context or book is no longer available.",
      };
    }

    try {
      await requireBookEntitlement(
        {
          id: scope.teacher.userId,
          role: "TEACHER",
        },
        {
          bookId,
          academicYearId:
            scope.academicYear.id,
          sectionId: scope.section.id,
          sectionSubjectId: subject.id,
        },
      );
    } catch {
      return {
        ok: false as const,
        message:
          SAFE_ENTITLEMENT_MESSAGES.book,
      };
    }

    /*
     * Resolve the exact current immutable V2 release.
     * The browser never chooses a release version.
     */
    const release =
      await resolvePublishedSmartBookContent({
        publisherId: scope.publisherId,
        bookId,
      });

    if (
      !release ||
      release.manifest.identity.bookId !==
        bookId ||
      release.manifest.identity.publisherId !==
        scope.publisherId
    ) {
      return {
        ok: false as const,
        message:
          "The selected book does not have a published Smart Book release.",
      };
    }

    const releasedChapters =
      release.manifest.hierarchy
        .filter(
          (node) =>
            node.kind === "CHAPTER" &&
            node.releaseVisible === true,
        )
        .sort(
          (left, right) =>
            left.displayOrder -
              right.displayOrder ||
            (left.number ?? 0) -
              (right.number ?? 0) ||
            left.title.localeCompare(
              right.title,
            ),
        );

    if (!releasedChapters.length) {
      return {
        ok: false as const,
        message:
          "The published Smart Book release has no available chapters.",
      };
    }

    const releasedChapterById = new Map(
      releasedChapters.map((chapter) => [
        chapter.sourceId,
        chapter,
      ]),
    );

    const chapters =
      input.coverage === "whole"
        ? releasedChapters
        : uniqueChapterIds
            .map((chapterId) =>
              releasedChapterById.get(
                chapterId,
              ),
            )
            .filter(
              (
                chapter,
              ): chapter is (typeof releasedChapters)[number] =>
                Boolean(chapter),
            );

    if (
      !chapters.length ||
      (input.coverage === "selected" &&
        chapters.length !==
          uniqueChapterIds.length)
    ) {
      return {
        ok: false as const,
        message:
          "One or more selected chapters are not in the published Smart Book release.",
      };
    }

    /*
     * The immutable multi-chapter grounding layer has an
     * explicit provider bound. Fail before creating a pending
     * generation if the requested released chapter set exceeds
     * that bound.
     */
    if (chapters.length > 24) {
      return {
        ok: false as const,
        message:
          "Please select up to 24 released chapters for one AI question paper.",
      };
    }

    const existing =
      await prisma.aiGeneration.findUnique({
        where: {
          id: input.generationId,
        },
        select: {
          teacherId: true,
          status: true,
          quotaConsumed: true,
          providerCalled: true,
        },
      });

    if (
      existing &&
      existing.teacherId !== teacher.id
    ) {
      return {
        ok: false as const,
        message:
          "We could not generate the paper. Please try again.",
      };
    }

    if (
      existing?.status === "COMPLETED" &&
      existing.quotaConsumed
    ) {
      return {
        ok: true as const,
        generationId:
          input.generationId,
        draftUrl:
          `/teacher-dashboard/ai/generations/${input.generationId}`,
      };
    }

    if (
      existing?.providerCalled &&
      existing.status === "DRAFT"
    ) {
      return {
        ok: false as const,
        message:
          "This paper is already being generated. Please wait.",
      };
    }

    const blueprint =
      buildBlueprint(input);

    const className =
      scope.schoolClass.name;
    const subjectName =
      subject.subject.name;

    const configuration = {
      version: 3,

      academic: {
        /*
         * These IDs remain server-side runtime authorization
         * context. The immutable prompt builder reconstructs a
         * provider-safe configuration and does not serialize
         * these internal identifiers.
         */
        sectionId: scope.section.id,
        sectionSubjectId: subject.id,
        bookId,
        classId:
          scope.schoolClass.id,
        subjectId: subject.subjectId,
        className,
        subjectName,
      },

      immutableRelease: {
        /*
         * Persisted only for internal provenance/audit.
         * Runtime retrieval independently resolves and
         * re-authorizes the exact release again.
         */
        releaseVersionId:
          release.releaseVersionId,
        versionNumber:
          release.versionNumber,
      },

      coverage: {
        mode: input.coverage,
        chapterCount: chapters.length,
      },

      settings: {
        title: input.title.trim(),
        examType: input.examType,
        pattern: input.pattern,
        totalMarks: input.totalMarks,
        duration: input.duration,
        difficulty: input.difficulty,
      },

      chapters: chapters.map(
        (chapter) => ({
          /*
           * sourceId/title/number come only from the immutable
           * published release manifest, never from the browser
           * or mutable BookChapter authoring rows.
           */
          id: chapter.sourceId,
          name: chapter.title,
          chapterNumber:
            chapter.number ?? 0,
        }),
      ),

      blueprint,

      distributionMode: "difficulty",

      distribution:
        difficultyDistribution(
          input.difficulty,
        ),

      options: {
        answerKey: true,
        markingScheme: true,
        ...input.advanced,
      },

      outputRequirements: {
        schoolName:
          "____________________________",
        className,
        subjectName,
        examType: input.examType,
        timeMinutes: input.duration,
        maximumMarks: input.totalMarks,
        includeGeneralInstructions: true,
        sectionLabels: [
          "Section A",
          "Section B",
          "Section C",
          "Section D",
        ],
        includeInternalChoices:
          input.advanced.internalChoices,
        includeAnswerKey: true,
        includeBloomSummary:
          input.advanced.bloomDistribution,
        includeCompetencyMapping:
          input.advanced.competencyPercent >
          0,
        includeTeacherNotes: true,
        futureActions: [
          "Assign to Class",
          "Save as Template",
          "Share with School",
          "Export PDF",
          "Export DOCX",
        ],
      },

      totals: {
        marks: input.totalMarks,
        questions: blueprint.reduce(
          (sum, row) =>
            sum + row.count,
          0,
        ),
      },
    };

    if (!existing) {
      await prisma.aiGeneration.create({
        data: {
          id: input.generationId,
          teacherId: teacher.id,
          tool:
            "Question Paper Generator",
          title: input.title.trim(),
          prompt:
            "Pending runtime preparation",
          status: "DRAFT",
        },
      });
    }

    const result =
      await executeAiGeneration({
        teacherId: teacher.id,
        generationId:
          input.generationId,
        tool:
          "Question Paper Generator",
        title: input.title.trim(),
        configuration,
      });

    if (!result.ok) {
      return {
        ok: false as const,
        message:
          publicGenerationMessage(
            result.code,
          ),
      };
    }

    revalidatePath(
      "/teacher-dashboard/ai/history",
    );

    return {
      ok: true as const,
      generationId:
        result.generationId,
      draftUrl:
        `/teacher-dashboard/ai/generations/${result.generationId}`,
    };
  } catch {
    return {
      ok: false as const,
      message:
        "We could not generate the paper. Please try again.",
    };
  }
}

function publicGenerationMessage(
  code: string,
) {
  if (code === "NOT_ENTITLED") {
    return "Premium AI access is required.";
  }

  if (code === "DAILY_LIMIT_REACHED") {
    return "Today's AI generation limit has been reached.";
  }

  if (code === "PROVIDER_TIMEOUT") {
    return "Generation took too long. Please try again.";
  }

  return "We could not generate the paper. Please try again.";
}

function buildBlueprint(
  input: GenerateQuestionPaperInput,
) {
  const types = [
    ...new Set(input.questionTypes),
  ];

  if (!input.autoDistribution) {
    const requested = types.map(
      (type) => ({
        type,
        count: Math.max(
          1,
          Math.min(
            50,
            Math.trunc(
              input.questionCounts[
                type
              ] ?? 1,
            ),
          ),
        ),
      }),
    );

    const totalQuestions =
      requested.reduce(
        (sum, row) =>
          sum + row.count,
        0,
      );

    return requested
      .map((row, index) => ({
        ...row,
        marks:
          index ===
          requested.length - 1
            ? input.totalMarks -
              Math.max(
                0,
                totalQuestions -
                  row.count,
              )
            : 1,
      }))
      .filter(
        (row) => row.marks > 0,
      );
  }

  const count = Math.max(
    types.length,
    Math.min(
      50,
      Math.trunc(
        input.estimatedQuestions,
      ),
    ),
  );

  const base = Math.floor(
    count / types.length,
  );

  const extra =
    count % types.length;

  const counts = types.map(
    (type, index) => ({
      type,
      count:
        base +
        (index < extra ? 1 : 0),
    }),
  );

  let remainingMarks =
    input.totalMarks;

  return counts.map(
    (row, index) => {
      const marks =
        index === counts.length - 1
          ? Math.max(
              1,
              Math.floor(
                remainingMarks /
                  row.count,
              ),
            )
          : Math.max(
              1,
              Math.floor(
                input.totalMarks /
                  count,
              ),
            );

      remainingMarks -=
        marks * row.count;

      return {
        ...row,
        marks,
      };
    },
  );
}

function difficultyDistribution(
  value:
    GenerateQuestionPaperInput["difficulty"],
) {
  if (value === "Easy") {
    return {
      first: 60,
      second: 30,
      third: 10,
      fourth: 0,
    };
  }

  if (value === "Advanced") {
    return {
      first: 10,
      second: 35,
      third: 55,
      fourth: 0,
    };
  }

  return {
    first: 30,
    second: 50,
    third: 20,
    fourth: 0,
  };
}
