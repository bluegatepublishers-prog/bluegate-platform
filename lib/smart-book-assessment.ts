import "server-only";

import {
  AssessmentStatus,
  PlatformFeatureKey,
  SecurityAuditOutcome,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { resolveManifestAssessmentExecution } from "@/lib/smart-book-release-projection";
import { resolvePublishedSmartBookContent } from "@/lib/smart-book-release-runtime";
import {
  buildCanonicalAssessmentReleaseSnapshot,
  type PreparedPublisherAssessmentInstantiation,
} from "@/lib/smart-book-assessment-snapshot";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";
import { requireTeacherSubject } from "@/lib/teacher-experience";

export const SMART_BOOK_ASSESSMENT_UNAVAILABLE = "This assessment is unavailable in this Smart Book release.";

export class SmartBookAssessmentError extends Error {
  constructor(message = SMART_BOOK_ASSESSMENT_UNAVAILABLE, readonly status = 404) {
    super(message);
    this.name = "SmartBookAssessmentError";
  }
}

export type InstantiatePublisherAssessmentInput = {
  sectionId: string;
  sectionSubjectId: string;
  bookId: string;
  publisherAssessmentId: string;
  teachingPeriodId?: string | null;
};

export async function instantiatePublisherAssessmentFromSmartBookRelease(input: InstantiatePublisherAssessmentInput) {
  const normalized = normalizeInput(input);
  const { scope, subject } = await requireTeacherSubject(normalized.sectionId, normalized.sectionSubjectId);
  if (!await isPublisherFeatureEnabled(scope.publisherId, PlatformFeatureKey.ASSESSMENTS)) throw new SmartBookAssessmentError(SMART_BOOK_ASSESSMENT_UNAVAILABLE, 403);

  const selectedBook = subject.bookAdoptions.map((row) => row.book).find((book) => book.id === normalized.bookId);
  if (!selectedBook || selectedBook.publisherId !== scope.publisherId) throw new SmartBookAssessmentError(SMART_BOOK_ASSESSMENT_UNAVAILABLE, 403);

  const teachingPeriodId = normalized.teachingPeriodId
    ? await resolveAuthorizedTeachingPeriod({
        teachingPeriodId: normalized.teachingPeriodId,
        teacherId: scope.teacher.id,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
        sectionId: normalized.sectionId,
        sectionSubjectId: subject.id,
        bookId: normalized.bookId,
      })
    : null;

  const release = await resolvePublishedSmartBookContent({ publisherId: scope.publisherId, bookId: normalized.bookId });
  if (!release) throw new SmartBookAssessmentError();
  const execution = resolveManifestAssessmentExecution({
    manifest: release.manifest,
    protectedPayload: release.protectedPayload,
    publisherAssessmentId: normalized.publisherAssessmentId,
    publisherId: scope.publisherId,
    bookId: normalized.bookId,
  });
  if (!execution) throw new SmartBookAssessmentError();

  const prepared: PreparedPublisherAssessmentInstantiation = {
    publisherId: scope.publisherId,
    schoolId: scope.schoolId,
    academicYearId: scope.academicYear.id,
    schoolClassId: scope.schoolClass.id,
    sectionId: normalized.sectionId,
    sectionSubjectId: subject.id,
    bookId: normalized.bookId,
    teachingPeriodId,
    createdById: scope.teacher.userId,
    contentReleaseVersionId: release.releaseVersionId,
    publisherAssessmentId: execution.assessment.sourceId,
    assessment: execution.assessment,
    questions: execution.questions,
  };

  return createCanonicalAssessmentFromPreparedRelease(prepared);
}

export async function createCanonicalAssessmentFromPreparedRelease(prepared: PreparedPublisherAssessmentInstantiation) {
  const snapshot = buildCanonicalAssessmentReleaseSnapshot(prepared);
  const lockKey = [
    "smart-book-assessment",
    prepared.contentReleaseVersionId,
    prepared.publisherAssessmentId,
    prepared.schoolId,
    prepared.academicYearId,
    prepared.sectionId,
    prepared.sectionSubjectId,
  ].join(":");

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

    const releaseStillExists = await tx.contentReleaseVersion.findFirst({
      where: {
        id: prepared.contentReleaseVersionId,
        publisherId: prepared.publisherId,
        bookId: prepared.bookId,
        targetType: "BOOK",
        targetId: prepared.bookId,
        lifecycle: "PUBLISHED",
        release: {
          publisherId: prepared.publisherId,
          bookId: prepared.bookId,
          targetType: "BOOK",
          targetId: prepared.bookId,
          lifecycle: "PUBLISHED",
        },
      },
      select: { id: true },
    });
    if (!releaseStillExists) throw new SmartBookAssessmentError();

    const existing = await tx.assessment.findFirst({
      where: {
        publisherId: prepared.publisherId,
        schoolId: prepared.schoolId,
        academicYearId: prepared.academicYearId,
        sectionId: prepared.sectionId,
        sectionSubjectId: prepared.sectionSubjectId,
        bookId: prepared.bookId,
        contentReleaseVersionId: prepared.contentReleaseVersionId,
        publisherAssessmentId: prepared.publisherAssessmentId,
        status: { not: AssessmentStatus.ARCHIVED },
      },
      select: { id: true, status: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    if (existing) return { assessmentId: existing.id, status: existing.status, reused: true as const };

    const created = await tx.assessment.create({
      data: snapshot.assessment,
      select: { id: true, status: true },
    });

    await tx.assessmentSettings.create({
      data: {
        assessmentId: created.id,
        ...snapshot.settings,
      },
    });

    await tx.assessmentQuestion.createMany({
      data: snapshot.questions.map((question) => ({
        assessmentId: created.id,
        ...question,
      })),
    });

    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: prepared.createdById, role: UserRole.TEACHER, publisherId: prepared.publisherId }),
      action: "classroom.assessment.create",
      targetType: "Assessment",
      targetId: created.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "classroom", toStatus: "DRAFT" },
    });

    return { assessmentId: created.id, status: created.status, reused: false as const };
  });
}

function normalizeInput(input: InstantiatePublisherAssessmentInput) {
  const sectionId = input.sectionId.trim();
  const sectionSubjectId = input.sectionSubjectId.trim();
  const bookId = input.bookId.trim();
  const publisherAssessmentId = input.publisherAssessmentId.trim();
  const teachingPeriodId = input.teachingPeriodId?.trim() || null;
  if (!sectionId || !sectionSubjectId || !bookId || !publisherAssessmentId) throw new SmartBookAssessmentError(SMART_BOOK_ASSESSMENT_UNAVAILABLE, 400);
  return { sectionId, sectionSubjectId, bookId, publisherAssessmentId, teachingPeriodId };
}

async function resolveAuthorizedTeachingPeriod(input: {
  teachingPeriodId: string;
  teacherId: string;
  schoolId: string;
  academicYearId: string;
  sectionId: string;
  sectionSubjectId: string;
  bookId: string;
}) {
  const period = await prisma.teachingPeriod.findFirst({
    where: {
      id: input.teachingPeriodId,
      plan: {
        teacherId: input.teacherId,
        schoolId: input.schoolId,
        academicYearId: input.academicYearId,
        sectionSubjectId: input.sectionSubjectId,
        bookId: input.bookId,
      },
      timetableEntry: {
        schoolId: input.schoolId,
        academicYearId: input.academicYearId,
        sectionId: input.sectionId,
        sectionSubjectId: input.sectionSubjectId,
        teacherAssignment: {
          teacherId: input.teacherId,
          schoolId: input.schoolId,
          academicYearId: input.academicYearId,
          sectionId: input.sectionId,
          active: true,
        },
      },
    },
    select: { id: true },
  });
  if (!period) throw new SmartBookAssessmentError(SMART_BOOK_ASSESSMENT_UNAVAILABLE, 403);
  return period.id;
}
