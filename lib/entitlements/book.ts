import "server-only";

import { BookAdoptionStatus, EnrollmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
import { SafeEntitlementError } from "./errors";
import { decideBookEntitlement, type BookEntitlementFacts } from "./book-policy";
import type {
  AuthenticatedEntitlementUser,
  BookEntitlementRequest,
  EntitlementDecision,
  EntitlementSubjectType,
} from "./types";

const deniedFacts = (
  user: AuthenticatedEntitlementUser,
): BookEntitlementFacts => ({
  authenticated: Boolean(user.id),
  role: (user.role as EntitlementSubjectType | undefined) ?? null,
  recordFound: false,
  published: false,
  publisherActive: false,
  samePublisher: false,
  schoolActive: true,
  academicContext: false,
  assignment: false,
  enrollment: false,
  schoolEntitled: false,
  adoptionApproved: false,
});

function schoolAccessIsActive(school: { status: string; accessSubscription: { plan: "FREE" | "PAID"; status: "ACTIVE" | "SUSPENDED" | "EXPIRED"; startsAt: Date | null; expiresAt: Date | null } | null } | null | undefined) {
  return Boolean(school?.status === "APPROVED" && school.accessSubscription && effectiveSchoolAccessStatus(school.accessSubscription) === "ACTIVE");
}

export async function getBookEntitlementForAuthenticatedUser(
  user: AuthenticatedEntitlementUser,
  request: BookEntitlementRequest,
): Promise<EntitlementDecision> {
  const base = deniedFacts(user);
  if (!user.id || !user.role) return decideBookEntitlement(base);
  const book = await prisma.book.findUnique({
    where: { id: request.bookId },
    select: { id: true, publisherId: true, published: true, archived: true },
  });
  base.recordFound = Boolean(book);
  base.published = Boolean(book?.published && !book.archived);
  if (!book?.publisherId) return decideBookEntitlement(base);

  if (user.role === "ADMIN") {
    const admin = await prisma.user.findUnique({
      where: { id: user.id },
      select: { publisherId: true, publisher: { select: { active: true } } },
    });
    base.publisherActive = Boolean(admin?.publisher?.active);
    base.samePublisher = admin?.publisherId === book.publisherId;
    return decideBookEntitlement(base);
  }

  if (user.role === "SCHOOL") {
    const school = await prisma.school.findUnique({
      where: { userId: user.id },
      include: { publisher: { select: { active: true } }, accessSubscription: true },
    });
    base.publisherActive = Boolean(school?.publisher?.active);
    base.samePublisher = school?.publisherId === book.publisherId;
    base.schoolActive = schoolAccessIsActive(school);
    if (!school) return decideBookEntitlement(base);
    base.schoolEntitled = Boolean(
      await prisma.schoolBookEntitlement.findFirst({
        where: {
          schoolId: school.id,
          bookId: book.id,
          publisherId: book.publisherId,
          status: "ACTIVE",
        },
        select: { id: true },
      }),
    );
    const year = await prisma.academicYear.findFirst({
      where: {
        id: request.academicYearId,
        schoolId: school.id,
        active: true,
        current: request.academicYearId ? undefined : true,
      },
      select: { id: true },
    });
    base.academicContext = Boolean(year);
    base.adoptionApproved = Boolean(
      year &&
        (await prisma.schoolBookAdoption.findFirst({
          where: {
            bookId: book.id,
            schoolId: school.id,
            publisherId: school.publisherId,
            academicYearId: year.id,
            sectionId: request.sectionId,
            sectionSubjectId: request.sectionSubjectId,
            status: BookAdoptionStatus.APPROVED,
            active: true,
            book: { publisherId: school.publisherId },
          },
          select: { id: true },
        })),
    );
    return decideBookEntitlement(base);
  }

  if (user.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
      include: {
        school: { include: { publisher: { select: { active: true } }, accessSubscription: true } },
        schoolMemberships: {
          where: { active: true, status: "ACTIVE" },
          select: { schoolId: true },
        },
      },
    });
    base.publisherActive = Boolean(teacher?.school?.publisher?.active);
    base.samePublisher = teacher?.school?.publisherId === book.publisherId;
    base.schoolActive = schoolAccessIsActive(teacher?.school);
    if (!teacher?.active || !teacher.schoolId || !teacher.school?.publisherId) {
      return decideBookEntitlement(base);
    }
    if (!teacher.schoolMemberships.some((membership) => membership.schoolId === teacher.schoolId)) {
      return decideBookEntitlement(base);
    }
    base.schoolEntitled = Boolean(
      await prisma.schoolBookEntitlement.findFirst({
        where: {
          schoolId: teacher.schoolId,
          bookId: book.id,
          publisherId: book.publisherId,
          status: "ACTIVE",
        },
        select: { id: true },
      }),
    );
    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        teacherId: teacher.id,
        schoolId: teacher.schoolId,
        active: true,
        academicYearId: request.academicYearId,
        sectionId: request.sectionId,
        academicYear: {
          active: true,
          current: request.academicYearId ? undefined : true,
        },
        schoolClass: { active: true },
        section: { active: true },
      },
      select: {
        academicYearId: true,
        sectionId: true,
        subjectId: true,
        type: true,
      },
    });
    base.academicContext = assignments.length > 0;
    base.assignment = assignments.length > 0;
    base.adoptionApproved = Boolean(
      assignments.length &&
        (await prisma.schoolBookAdoption.findFirst({
          where: {
            bookId: book.id,
            schoolId: teacher.schoolId,
            publisherId: teacher.school.publisherId,
            status: BookAdoptionStatus.APPROVED,
            active: true,
            sectionSubjectId: request.sectionSubjectId,
            book: { publisherId: teacher.school.publisherId },
            OR: assignments.map((assignment) => ({
              academicYearId: assignment.academicYearId,
              sectionId: assignment.sectionId,
              ...(assignment.type === "SUBJECT_TEACHER"
                ? { sectionSubject: { subjectId: assignment.subjectId ?? "" } }
                : {}),
            })),
          },
          select: { id: true },
        })),
    );
    return decideBookEntitlement(base);
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      include: { school: { include: { publisher: { select: { active: true } }, accessSubscription: true } } },
    });
    base.publisherActive = Boolean(student?.school.publisher?.active);
    base.samePublisher = student?.school.publisherId === book.publisherId;
    base.schoolActive = schoolAccessIsActive(student?.school);
    if (!student?.active || !student.school.publisherId) {
      return decideBookEntitlement(base);
    }
    base.schoolEntitled = Boolean(
      await prisma.schoolBookEntitlement.findFirst({
        where: {
          schoolId: student.schoolId,
          bookId: book.id,
          publisherId: book.publisherId,
          status: "ACTIVE",
        },
        select: { id: true },
      }),
    );
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: student.id,
        schoolId: student.schoolId,
        academicYearId: request.academicYearId,
        sectionId: request.sectionId,
        status: EnrollmentStatus.ACTIVE,
        academicYear: {
          active: true,
          current: request.academicYearId ? undefined : true,
        },
        schoolClass: { active: true },
        section: { active: true },
      },
      select: { academicYearId: true, sectionId: true },
    });
    base.academicContext = Boolean(enrollment);
    base.enrollment = Boolean(enrollment);
    base.adoptionApproved = Boolean(
      enrollment &&
        (await prisma.schoolBookAdoption.findFirst({
          where: {
            bookId: book.id,
            schoolId: student.schoolId,
            publisherId: student.school.publisherId,
            academicYearId: enrollment.academicYearId,
            sectionId: enrollment.sectionId,
            sectionSubjectId: request.sectionSubjectId,
            status: BookAdoptionStatus.APPROVED,
            active: true,
            book: { publisherId: student.school.publisherId },
          },
          select: { id: true },
        })),
    );
    return decideBookEntitlement(base);
  }

  return decideBookEntitlement(base);
}

export async function requireBookEntitlement(
  user: AuthenticatedEntitlementUser,
  request: BookEntitlementRequest,
) {
  const decision = await getBookEntitlementForAuthenticatedUser(user, request);
  if (!decision.allowed) throw new SafeEntitlementError("book");
  return decision;
}

export async function getTeacherEntitledBookIds(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: { school: { include: { publisher: { select: { active: true } }, accessSubscription: true } } },
  });
  if (
    !teacher?.active ||
    !teacher.schoolId ||
    !teacher.school?.publisherId ||
    !teacher.school.publisher?.active ||
    !schoolAccessIsActive(teacher.school)
  ) {
    return [];
  }
  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      teacherId: teacher.id,
      schoolId: teacher.schoolId,
      active: true,
      academicYear: { current: true, active: true },
      schoolClass: { active: true },
      section: { active: true },
    },
    select: { academicYearId: true, sectionId: true, subjectId: true, type: true },
  });
  if (!assignments.length) return [];
  const adoptions = await prisma.schoolBookAdoption.findMany({
    where: {
      schoolId: teacher.schoolId,
      publisherId: teacher.school.publisherId,
      status: BookAdoptionStatus.APPROVED,
      active: true,
      book: {
        publisherId: teacher.school.publisherId,
        published: true,
        archived: false,
        schoolEntitlements: {
          some: {
            schoolId: teacher.schoolId,
            publisherId: teacher.school.publisherId,
            status: "ACTIVE",
          },
        },
      },
      OR: assignments.map((assignment) => ({
        academicYearId: assignment.academicYearId,
        sectionId: assignment.sectionId,
        ...(assignment.type === "SUBJECT_TEACHER"
          ? { sectionSubject: { subjectId: assignment.subjectId ?? "" } }
          : {}),
      })),
    },
    select: { bookId: true },
  });
  return [...new Set(adoptions.map((adoption) => adoption.bookId))];
}
