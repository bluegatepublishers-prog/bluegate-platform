import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { isEligibleForSchoolManagedStudentAccount } from "@/lib/student-account-policy";

export type StudentAccountStatus = "ACTIVE" | "NOT_ACTIVATED" | "INELIGIBLE";

export type StudentAccountRow = {
  id: string;
  admissionNumber: string;
  studentName: string;
  className: string;
  sectionName: string;
  rollNumber: string | null;
  academicYear: string;
  email: string | null;
  loginId: string | null;
  status: StudentAccountStatus;
  eligible: boolean;
};

export type StudentAccountWorkspace = {
  rows: StudentAccountRow[];
  summary: {
    totalStudents: number;
    activeAccounts: number;
    notActivated: number;
    unavailable: number;
  };
};

export async function getStudentAccountWorkspace(): Promise<StudentAccountWorkspace> {
  const school = await requireSchool();
  const students = await prisma.student.findMany({
    where: { schoolId: school.id },
    select: {
      id: true,
      admissionNumber: true,
      name: true,
      displayName: true,
      email: true,
      active: true,
      userId: true,
      user: { select: { username: true, active: true, role: true } },
      enrollments: {
        where: {
          schoolId: school.id,
          status: "ACTIVE",
          academicYear: { active: true, current: true },
          schoolClass: { active: true },
          section: { active: true },
        },
        select: {
          academicYear: { select: { id: true, name: true, active: true, current: true } },
          schoolClass: { select: { id: true, name: true, active: true } },
          section: { select: { id: true, name: true, active: true } },
          rollNumber: true,
        },
        orderBy: [{ joinedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }, { admissionNumber: "asc" }],
  });

  const rows = students.map((student) => {
    const enrollment = student.enrollments[0] ?? null;
    const hasUser = Boolean(student.userId);
    const eligible = isEligibleForSchoolManagedStudentAccount({
      studentSchoolId: school.id,
      authenticatedSchoolId: school.id,
      studentPublisherId: school.publisherId,
      schoolPublisherId: school.publisherId,
      studentActive: student.active,
      schoolActive: school.status === "APPROVED",
      publisherActive: true,
      hasCurrentActiveEnrollment: Boolean(enrollment),
      hasUser,
    });
    const status: StudentAccountStatus = hasUser ? "ACTIVE" : eligible ? "NOT_ACTIVATED" : "INELIGIBLE";
    return {
      id: student.id,
      admissionNumber: student.admissionNumber,
      studentName: student.displayName || student.name,
      className: enrollment?.schoolClass.name ?? "Not assigned",
      sectionName: enrollment?.section.name ?? "Not assigned",
      rollNumber: enrollment?.rollNumber ?? null,
      academicYear: enrollment?.academicYear.name ?? "Not assigned",
      email: student.email,
      loginId: student.user?.username ?? null,
      status,
      eligible,
    };
  });

  return {
    rows,
    summary: {
      totalStudents: rows.length,
      activeAccounts: rows.filter((row) => row.status === "ACTIVE").length,
      notActivated: rows.filter((row) => row.status === "NOT_ACTIVATED").length,
      unavailable: rows.filter((row) => row.status === "INELIGIBLE").length,
    },
  };
}
