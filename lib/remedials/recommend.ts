import "server-only";

import {
  AssessmentStatus,
  BookAdoptionStatus,
  PlatformFeatureKey,
  RemedialRecommendationType,
  ResourceAudience,
  ResourceType,
} from "@prisma/client";

import { planIncludesPremiumFeature } from "@/lib/entitlements/features-policy";
import { getEffectiveStudentPlan } from "@/lib/entitlements/student-plan";
import { prisma } from "@/lib/prisma";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import type { SmartBookReleaseManifestV2 } from "@/lib/smart-book-release-manifest";
import { resolvePublishedSmartBookContent } from "@/lib/smart-book-release-runtime";
import { getV2AssessmentLauncherPayload } from "@/lib/v2-assessment-launcher";

import { buildRemedialDraft } from "./policy";
import type { ApprovedRemedialReference } from "./types";

function chapterLabel(input: {
  number: number | null;
  title: string;
}) {
  return input.number != null
    ? `Chapter ${input.number}: ${input.title}`
    : input.title;
}

/**
 * Determine whether the exact immutable released chapter exposes
 * interactive question practice.
 *
 * Merely having questions or exercises in authoring/storage is not enough.
 * The released V2 document must contain a question launcher whose immutable
 * exercise belongs to the released chapter hierarchy.
 */
function hasImmutableChapterPractice(input: {
  chapterId: string;
  manifest: SmartBookReleaseManifestV2;
}) {
  const chapterExerciseIds = new Set(
    input.manifest.hierarchy
      .filter(
        (item) =>
          item.kind === "EXERCISE" &&
          item.chapterSourceId === input.chapterId,
      )
      .map((item) => item.sourceId),
  );

  if (!chapterExerciseIds.size) {
    return false;
  }

  for (
    const page of
      input.manifest.contentDocument.pageLayout?.pages ?? []
  ) {
    const stack = [...page.frames];

    while (stack.length) {
      const frame = stack.pop();

      if (!frame) {
        continue;
      }

      for (const child of frame.children ?? []) {
        stack.push(child);
      }

      const launcher =
        getV2AssessmentLauncherPayload(frame);

      if (
        !launcher ||
        launcher.launcherType !== "question"
      ) {
        continue;
      }

      if (
        chapterExerciseIds.has(
          launcher.target.exerciseId,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export async function recommendForGap(
  gapId: string,
  now = new Date(),
) {
  const gap =
    await prisma.studentLearningGap.findUnique({
      where: {
        id: gapId,
      },
      select: {
        id: true,
        publisherId: true,
        schoolId: true,
        studentId: true,
        academicYearId: true,
        subjectId: true,
        bookId: true,
        chapterId: true,
        severity: true,
        status: true,
        latestRunId: true,
      },
    });

  if (
    !gap ||
    !["OPEN", "ACKNOWLEDGED"].includes(
      gap.status,
    )
  ) {
    return null;
  }

  if (
    !await isPublisherFeatureEnabled(
      gap.publisherId,
      PlatformFeatureKey.REMEDIALS,
    )
  ) {
    return null;
  }

  const plan = await getEffectiveStudentPlan(
    gap.studentId,
    gap.academicYearId,
    now,
  );

  if (
    !planIncludesPremiumFeature(
      plan.plan,
      "REMEDIALS",
    )
  ) {
    return null;
  }

  const enrollment =
    await prisma.studentEnrollment.findFirst({
      where: {
        studentId: gap.studentId,
        academicYearId: gap.academicYearId,
        schoolId: gap.schoolId,
        status: "ACTIVE",
      },
      select: {
        sectionId: true,
        schoolClassId: true,
      },
    });

  if (!enrollment) {
    return null;
  }

  const adopted =
    await prisma.schoolBookAdoption.findMany({
      where: {
        schoolId: gap.schoolId,
        academicYearId: gap.academicYearId,
        sectionId: enrollment.sectionId,
        status: BookAdoptionStatus.APPROVED,
        active: true,

        ...(gap.bookId
          ? {
              bookId: gap.bookId,
            }
          : gap.subjectId
            ? {
                sectionSubject: {
                  subjectId: gap.subjectId,
                  active: true,
                },
              }
            : {
                id: "__none__",
              }),
      },

      select: {
        bookId: true,
        sectionSubjectId: true,
      },

      orderBy: [
        {
          approvedAt: "asc",
        },
        {
          id: "asc",
        },
      ],
    });

  if (!adopted.length) {
    return null;
  }

  const bookId =
    gap.bookId ?? adopted[0].bookId;

  /*
   * Immutable Smart Book boundary.
   *
   * From this point, chapter identity, chapter order, title, number,
   * page range and interactive-practice availability must come from
   * the current published V2 Smart Book release.
   *
   * Do not reintroduce mutable BookChapter or BookQuestion queries here.
   */
  const released =
    await resolvePublishedSmartBookContent({
      publisherId: gap.publisherId,
      bookId,
    });

  if (!released) {
    return null;
  }

  const releasedChapters =
    released.manifest.hierarchy
      .filter(
        (item) =>
          item.kind === "CHAPTER",
      )
      .sort((left, right) => {
        const order =
          left.displayOrder -
          right.displayOrder;

        if (order !== 0) {
          return order;
        }

        const number =
          (left.number ??
            Number.MAX_SAFE_INTEGER) -
          (right.number ??
            Number.MAX_SAFE_INTEGER);

        if (number !== 0) {
          return number;
        }

        return left.sourceId.localeCompare(
          right.sourceId,
        );
      });

  const chapter = gap.chapterId
    ? releasedChapters.find(
        (item) =>
          item.sourceId === gap.chapterId,
      ) ?? null
    : releasedChapters[0] ?? null;

  /*
   * Fail closed if the Gap references a chapter that is not part
   * of the exact current published V2 release.
   */
  if (!chapter) {
    return null;
  }

  const label = chapterLabel({
    number: chapter.number,
    title: chapter.title,
  });

  const refs: ApprovedRemedialReference[] =
    [];

  if (
    chapter.startPage != null &&
    chapter.endPage != null
  ) {
    refs.push({
      type:
        RemedialRecommendationType.SPECIFIC_PAGES,
      labelSnapshot: label,
      required: true,
      bookId,
      chapterId: chapter.sourceId,
      pageStart: chapter.startPage,
      pageEnd: chapter.endPage,
    });
  } else {
    refs.push({
      type:
        RemedialRecommendationType.BOOK_CHAPTER,
      labelSnapshot: label,
      required: true,
      bookId,
      chapterId: chapter.sourceId,
    });
  }

  refs.push({
    type:
      RemedialRecommendationType.REVISION_HUB,
    labelSnapshot: label,
    required: true,
    bookId,
    chapterId: chapter.sourceId,
  });

  /*
   * School/runtime resources remain live runtime entities.
   *
   * They are already Publisher-, Student-audience- and
   * SectionSubject-scoped, and are not mutable Smart Book
   * chapter/question educational authoring state.
   */
  const sectionSubjectIds = adopted
    .filter(
      (row) => row.bookId === bookId,
    )
    .map(
      (row) => row.sectionSubjectId,
    );

  const resources =
    await prisma.resource.findMany({
      where: {
        publisherId: gap.publisherId,
        published: true,

        audience: {
          in: [
            ResourceAudience.STUDENT,
            ResourceAudience.BOTH,
          ],
        },

        type: {
          in: [
            ResourceType.VIDEO,
            ResourceType.PPT,
          ],
        },

        sectionSubjects: {
          some: {
            id: {
              in: sectionSubjectIds,
            },
          },
        },
      },

      orderBy: [
        {
          type: "asc",
        },
        {
          title: "asc",
        },
        {
          id: "asc",
        },
      ],

      take: 4,

      select: {
        id: true,
        title: true,
        type: true,
      },
    });

  for (const resource of resources) {
    refs.push({
      type:
        resource.type ===
        ResourceType.VIDEO
          ? RemedialRecommendationType.VIDEO
          : RemedialRecommendationType.PPT,

      labelSnapshot: resource.title,
      required: true,
      resourceId: resource.id,
      bookId,
      chapterId: chapter.sourceId,
    });
  }

  if (
    hasImmutableChapterPractice({
      chapterId: chapter.sourceId,
      manifest: released.manifest,
    })
  ) {
    refs.push({
      type:
        RemedialRecommendationType.INTERACTIVE_PRACTICE,
      labelSnapshot: label,
      required: true,
      bookId,
      chapterId: chapter.sourceId,
    });
  }

  /*
   * Canonical school Assessment remains a live runtime entity.
   * Recommendation generation does not inspect its answers or
   * Student responses.
   */
  const assessment =
    await prisma.assessment.findFirst({
      where: {
        publisherId: gap.publisherId,
        schoolId: gap.schoolId,
        academicYearId:
          gap.academicYearId,
        sectionId:
          enrollment.sectionId,
        bookId,
        status:
          AssessmentStatus.PUBLISHED,

        OR: [
          {
            chapterId:
              chapter.sourceId,
          },
          {
            chapterId: null,
          },
        ],
      },

      orderBy: [
        {
          chapterId: "desc",
        },
        {
          publishedAt: "desc",
        },
        {
          id: "asc",
        },
      ],

      select: {
        id: true,
        title: true,
      },
    });

  if (assessment) {
    refs.push({
      type:
        RemedialRecommendationType.ASSESSMENT_RETRY,
      labelSnapshot: assessment.title,
      required: true,
      assessmentId: assessment.id,
      bookId,
      chapterId: chapter.sourceId,
    });
  }

  if (
    planIncludesPremiumFeature(
      plan.plan,
      "STUDENT_AI",
    ) &&
    await isPublisherFeatureEnabled(
      gap.publisherId,
      PlatformFeatureKey.STUDENT_AI,
    )
  ) {
    refs.push({
      type:
        RemedialRecommendationType.STUDENT_AI,
      labelSnapshot: label,
      required: false,
      bookId,
      chapterId: chapter.sourceId,
    });
  }

  return {
    gap,

    draft: buildRemedialDraft({
      severity: gap.severity,
      references: refs,
      now,
    }),
  };
}