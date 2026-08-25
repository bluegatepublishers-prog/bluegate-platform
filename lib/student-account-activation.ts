import { Prisma, SecurityAuditOutcome, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateInitialPassword, hashPassword } from "@/lib/password";
import { accountAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";
import { generateUniqueStudentLoginId } from "@/lib/student-login-id";
import { isEligibleForSchoolManagedStudentAccount } from "@/lib/student-account-policy";

export const STUDENT_ACCOUNT_ACTIVATION_CONCURRENCY = 25;
export const STUDENT_ACCOUNT_ACTIVATION_MAX_SELECTION = 5000;
const USERNAME_RETRY_LIMIT = 3;

export class StudentAccountActivationAuthorizationError extends Error {}

export type StudentAccountActivationCredential = {
  admissionNumber: string;
  studentName: string;
  className: string;
  sectionName: string;
  rollNumber: string | null;
  loginId: string;
  initialPassword: string;
};

export type StudentAccountActivationFailure = {
  studentId: string;
  admissionNumber: string | null;
  studentName: string | null;
  message: string;
};

export type StudentAccountActivationResult = {
  requested: number;
  activated: number;
  alreadyActive: number;
  failed: number;
  credentials: StudentAccountActivationCredential[];
  failures: StudentAccountActivationFailure[];
};

type ActivationStudentSnapshot = {
  id: string;
  admissionNumber: string;
  name: string;
  displayName: string | null;
  email: string | null;
  active: boolean;
  userId: string | null;
  school: { id: string; status: string; publisherId: string | null; publisher: { active: boolean } | null };
  enrollments: Array<{
    rollNumber: string | null;
    academicYear: { name: string; active: boolean; current: boolean };
    schoolClass: { name: string; active: boolean };
    section: { name: string; active: boolean };
  }>;
};

function isActivationEligible(student: ActivationStudentSnapshot, schoolId: string, publisherId: string | null) {
  const enrollment = student.enrollments[0];
  return isEligibleForSchoolManagedStudentAccount({
    studentSchoolId: student.school.id,
    authenticatedSchoolId: schoolId,
    studentPublisherId: student.school.publisherId,
    schoolPublisherId: publisherId,
    studentActive: student.active,
    schoolActive: student.school.status === "APPROVED",
    publisherActive: Boolean(student.school.publisher?.active),
    hasCurrentActiveEnrollment: Boolean(enrollment),
    hasUser: Boolean(student.userId),
  });
}

async function activateOneStudent(input: {
  studentId: string;
  schoolId: string;
  publisherId: string;
}) {
  const temporaryPassword = generateInitialPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  for (let attempt = 0; attempt < USERNAME_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`school-student-account-activation:${input.studentId}`}))`;
        const student = await tx.student.findFirst({
          where: {
            id: input.studentId,
            schoolId: input.schoolId,
            active: true,
            userId: null,
            school: { id: input.schoolId, status: "APPROVED", publisherId: input.publisherId, publisher: { active: true } },
            enrollments: {
              some: {
                schoolId: input.schoolId,
                status: "ACTIVE",
                academicYear: { active: true, current: true },
                schoolClass: { active: true },
                section: { active: true },
              },
            },
          },
          select: {
            id: true,
            admissionNumber: true,
            name: true,
            displayName: true,
            email: true,
            active: true,
            userId: true,
            school: { select: { id: true, status: true, publisherId: true, publisher: { select: { active: true } } } },
            enrollments: {
              where: {
                schoolId: input.schoolId,
                status: "ACTIVE",
                academicYear: { active: true, current: true },
                schoolClass: { active: true },
                section: { active: true },
              },
              select: {
                rollNumber: true,
                academicYear: { select: { name: true, active: true, current: true } },
                schoolClass: { select: { name: true, active: true } },
                section: { select: { name: true, active: true } },
              },
              orderBy: [{ joinedAt: "desc" }, { createdAt: "desc" }],
              take: 1,
            },
          },
        });

        if (!student) {
          const current = await tx.student.findUnique({
            where: { id: input.studentId },
            select: { id: true, admissionNumber: true, name: true, displayName: true, userId: true },
          });
          if (current?.userId) return { status: "ALREADY_ACTIVE" as const };
          return {
            status: "FAILED" as const,
            failure: {
              studentId: input.studentId,
              admissionNumber: current?.admissionNumber ?? null,
              studentName: current?.displayName || current?.name || null,
              message: "The student is no longer eligible for school-managed activation.",
            },
          };
        }

        const enrollment = student.enrollments[0];
        if (!isActivationEligible(student, input.schoolId, input.publisherId) || !enrollment) {
          return {
            status: "FAILED" as const,
            failure: {
              studentId: student.id,
              admissionNumber: student.admissionNumber,
              studentName: student.displayName || student.name,
              message: "The student is no longer eligible for school-managed activation.",
            },
          };
        }

        const loginId = await generateUniqueStudentLoginId(async (candidate) => Boolean(await tx.user.findUnique({ where: { username: candidate }, select: { id: true } })));
        const user = await tx.user.create({
          data: {
            name: student.displayName || student.name,
            email: null,
            username: loginId,
            password: passwordHash,
            passwordChangedAt: new Date(),
            emailVerifiedAt: null,
            role: UserRole.STUDENT,
            active: true,
            mustChangePassword: false,
            publisherId: input.publisherId,
          },
          select: { id: true },
        });
        const linked = await tx.student.updateMany({ where: { id: student.id, schoolId: input.schoolId, userId: null }, data: { userId: user.id } });
        if (linked.count !== 1) throw new Error("The student account could not be linked safely.");
        return {
          status: "ACTIVATED" as const,
          credential: {
            admissionNumber: student.admissionNumber,
            studentName: student.displayName || student.name,
            className: enrollment.schoolClass.name,
            sectionName: enrollment.section.name,
            rollNumber: enrollment.rollNumber,
            loginId,
            initialPassword: temporaryPassword,
          },
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt + 1 < USERNAME_RETRY_LIMIT) continue;
      return {
        status: "FAILED" as const,
        failure: { studentId: input.studentId, admissionNumber: null, studentName: null, message: "The student account could not be created safely." },
      };
    }
  }
  return {
    status: "FAILED" as const,
    failure: { studentId: input.studentId, admissionNumber: null, studentName: null, message: "The student account could not be created safely." },
  };
}

async function processBounded<T>(items: string[], worker: (item: string) => Promise<T>, concurrency: number) {
  const results: T[] = [];
  for (let index = 0; index < items.length; index += concurrency) {
    const batch = items.slice(index, index + concurrency);
    results.push(...await Promise.all(batch.map(worker)));
  }
  return results;
}

export async function activateStudentAccounts(input: {
  schoolId: string;
  publisherId: string;
  actorUserId: string;
  studentIds: string[];
}) : Promise<StudentAccountActivationResult> {
  const studentIds = [...new Set(input.studentIds.map((id) => id.trim()).filter(Boolean))];
  if (!studentIds.length || studentIds.length > STUDENT_ACCOUNT_ACTIVATION_MAX_SELECTION) throw new StudentAccountActivationAuthorizationError("Select between 1 and 5,000 students.");

  const ownedStudents = await prisma.student.findMany({ where: { id: { in: studentIds }, schoolId: input.schoolId }, select: { id: true } });
  if (ownedStudents.length !== studentIds.length) throw new StudentAccountActivationAuthorizationError("Some selected students are unavailable.");

  const outcomes = await processBounded(studentIds, (studentId) => activateOneStudent({ studentId, schoolId: input.schoolId, publisherId: input.publisherId }), STUDENT_ACCOUNT_ACTIVATION_CONCURRENCY);
  const credentials = outcomes.flatMap((outcome) => outcome.status === "ACTIVATED" ? [outcome.credential] : []);
  const failures = outcomes.flatMap((outcome) => outcome.status === "FAILED" ? [outcome.failure] : []);
  const result = {
    requested: studentIds.length,
    activated: credentials.length,
    alreadyActive: outcomes.filter((outcome) => outcome.status === "ALREADY_ACTIVE").length,
    failed: failures.length,
    credentials,
    failures,
  };
  await recordTrustedAuditBestEffort({
    actor: accountAuditActor({ id: input.actorUserId, role: UserRole.SCHOOL, publisherId: input.publisherId }),
    action: "school.student.account_activation.bulk",
    targetType: "School",
    targetId: input.schoolId,
    outcome: result.failed && !result.activated ? SecurityAuditOutcome.FAILURE : SecurityAuditOutcome.SUCCESS,
    metadata: { requestedCount: result.requested, activatedCount: result.activated, alreadyActiveCount: result.alreadyActive, failedCount: result.failed },
  });
  return result;
}
