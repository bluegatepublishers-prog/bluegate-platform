import type { EffectiveStudentPlan } from "./entitlements/student-plan-policy";

export type StudentIdentityFailure =
  | "WRONG_ROLE"
  | "STUDENT_NOT_FOUND"
  | "STUDENT_INACTIVE"
  | "PUBLISHER_UNAVAILABLE"
  | "WRONG_PUBLISHER"
  | "NO_CURRENT_ENROLLMENT"
  | "INVALID_ACADEMIC_SCOPE";

export interface StudentRecord {
  id: string;
  userId: string | null;
  schoolId: string;
  admissionNumber: string;
  name: string;
  email: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  active: boolean;
  school: {
    id: string;
    schoolName: string;
    city: string;
    state: string;
    logoUrl: string | null;
    publisherId: string | null;
    publisher: { id: string; active: boolean } | null;
  };
}

export interface CurrentEnrollmentRecord {
  id: string;
  studentId: string;
  schoolId: string;
  academicYearId: string;
  schoolClassId: string;
  sectionId: string;
  rollNumber: string | null;
  status: string;
  academicYear: { id: string; schoolId: string; name: string; active: boolean; current: boolean };
  schoolClass: { id: string; schoolId: string; academicYearId: string; name: string; active: boolean };
  section: { id: string; schoolClassId: string; name: string; active: boolean };
}

export interface StudentIdentityDependencies {
  findStudentByUserId(userId: string): Promise<StudentRecord | null>;
  findCurrentEnrollment(studentId: string, schoolId: string): Promise<CurrentEnrollmentRecord | null>;
  getEffectivePlan(studentId: string, academicYearId: string): Promise<EffectiveStudentPlan>;
}

export type StudentIdentityResult =
  | {
      ok: true;
      value: {
        student: StudentRecord;
        enrollment: CurrentEnrollmentRecord;
        school: StudentRecord["school"];
        publisher: NonNullable<StudentRecord["school"]["publisher"]>;
        academicYear: CurrentEnrollmentRecord["academicYear"];
        effectivePlan: EffectiveStudentPlan;
        entitlements: {
          plan: EffectiveStudentPlan["plan"];
          source: EffectiveStudentPlan["source"];
          premium: boolean;
        };
      };
    }
  | { ok: false; reason: StudentIdentityFailure };

export async function resolveStudentIdentity(
  input: { userId: string; role: string | null | undefined; userPublisherId?: string | null },
  dependencies: StudentIdentityDependencies,
): Promise<StudentIdentityResult> {
  if (input.role !== "STUDENT") return { ok: false, reason: "WRONG_ROLE" };
  const student = await dependencies.findStudentByUserId(input.userId);
  if (!student || student.userId !== input.userId) {
    return { ok: false, reason: "STUDENT_NOT_FOUND" };
  }
  if (!student.active) return { ok: false, reason: "STUDENT_INACTIVE" };
  const publisher = student.school.publisher;
  if (!student.school.publisherId || !publisher?.active) {
    return { ok: false, reason: "PUBLISHER_UNAVAILABLE" };
  }
  if (
    publisher.id !== student.school.publisherId ||
    (input.userPublisherId && input.userPublisherId !== publisher.id)
  ) {
    return { ok: false, reason: "WRONG_PUBLISHER" };
  }
  const enrollment = await dependencies.findCurrentEnrollment(student.id, student.schoolId);
  if (!enrollment) return { ok: false, reason: "NO_CURRENT_ENROLLMENT" };
  if (
    enrollment.studentId !== student.id ||
    enrollment.schoolId !== student.schoolId ||
    enrollment.academicYear.schoolId !== student.schoolId ||
    enrollment.schoolClass.schoolId !== student.schoolId ||
    enrollment.schoolClass.academicYearId !== enrollment.academicYearId ||
    enrollment.section.schoolClassId !== enrollment.schoolClassId ||
    !enrollment.academicYear.active ||
    !enrollment.academicYear.current ||
    enrollment.status !== "ACTIVE" ||
    !enrollment.schoolClass.active ||
    !enrollment.section.active
  ) {
    return { ok: false, reason: "INVALID_ACADEMIC_SCOPE" };
  }
  const effectivePlan = await dependencies.getEffectivePlan(student.id, enrollment.academicYearId);
  return {
    ok: true,
    value: {
      student,
      enrollment,
      school: student.school,
      publisher,
      academicYear: enrollment.academicYear,
      effectivePlan,
      entitlements: {
        plan: effectivePlan.plan,
        source: effectivePlan.source,
        premium: effectivePlan.plan !== "SCHOOL_BASIC",
      },
    },
  };
}

export function studentSessionClaims(identity: StudentIdentityResult) {
  if (!identity.ok) return null;
  const { student, school, publisher, academicYear } = identity.value;
  return {
    studentId: student.id,
    schoolId: school.id,
    publisherId: publisher.id,
    academicYearId: academicYear.id,
    academicYear: academicYear.name,
  };
}
