import { notFound } from "next/navigation";
import { SchoolStaffRole, type Prisma, type ResourceType } from "@prisma/client";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getSchoolResourceScope } from "@/lib/resource-audience";
import { buildSchoolSetupChecklist } from "@/lib/school-setup-checklist";
import { buildAcademicCoverage } from "@/lib/school-academic-management";

export async function requireSchool() {
  const user = await requireUser(["SCHOOL"]);
  const school = await prisma.school.findFirst({ where: { userId: user.id, status: "APPROVED", user: { active: true }, publisher: { active: true } }, include: { user: true, publisher: { select: { id: true, name: true, active: true } } } });
  if (!school?.publisher) notFound();
  return { ...school, publisher: school.publisher };
}

export async function getSchoolDashboard() {
  const school = await requireSchool();
  const [currentYear, resourceScope] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { schoolId: school.id, current: true },
      select: { id: true, name: true },
    }),
    getSchoolResourceScope(school.userId),
  ]);

  const scope = currentYear
    ? { schoolId: school.id, academicYearId: currentYear.id, active: true }
    : { schoolId: school.id, academicYearId: "", active: true };

  const [
    teachers,
    staffMemberships,
    students,
    classes,
    sectionRows,
    sectionSubjectRows,
    assignmentGroups,
    resources,
    recentStudents,
    recentAssignments,
    pendingTeacherRequests,
    approvedBookAdoptions,
    pendingBookAdoptions,
  ] = await prisma.$transaction([
    prisma.teacher.count({ where: { schoolId: school.id, active: true, status: "APPROVED" } }),
    prisma.schoolStaffMembership.count({ where: { schoolId: school.id, active: true } }),
    prisma.student.count({ where: { schoolId: school.id, active: true } }),
    prisma.schoolClass.count({
      where: { schoolId: school.id, academicYearId: currentYear?.id ?? "", active: true },
    }),
    prisma.classSection.findMany({
      where: {
        schoolClass: {
          schoolId: school.id,
          academicYearId: currentYear?.id ?? "",
          active: true,
        },
        active: true,
      },
      select: { id: true },
    }),
    prisma.sectionSubject.findMany({
      where: {
        active: true,
        section: {
          active: true,
          schoolClass: {
            schoolId: school.id,
            academicYearId: currentYear?.id ?? "",
            active: true,
          },
        },
      },
      select: { sectionId: true, subjectId: true },
    }),
    prisma.teacherAssignment.findMany({ where: scope, select: { sectionId: true, subjectId: true, type: true } }),
    prisma.resource.count({ where: resourceScope?.where ?? { id: "" } }),
    prisma.student.findMany({
      where: { schoolId: school.id, active: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        admissionNumber: true,
        createdAt: true,
      },
    }),
    prisma.teacherAssignment.findMany({
      where: scope,
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        teacher: { select: { user: { select: { name: true } } } },
        schoolClass: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true } },
      },
    }),
    prisma.teacherSchoolRequest.count({
      where: { schoolId: school.id, status: "PENDING" },
    }),
    prisma.schoolBookAdoption.count({ where: { schoolId: school.id, academicYearId: currentYear?.id ?? "", status: "APPROVED", active: true } }),
    prisma.schoolBookAdoption.count({ where: { schoolId: school.id, academicYearId: currentYear?.id ?? "", status: "PENDING", active: true } }),
  ]);

  const coverage = buildAcademicCoverage({
    sections: sectionRows,
    sectionSubjects: sectionSubjectRows,
    assignments: assignmentGroups,
  });

  const checklist = buildSchoolSetupChecklist({
    hasProfileBasics: Boolean(
      school.schoolName?.trim() &&
      school.city?.trim() &&
      school.state?.trim() &&
      school.user?.email?.trim(),
    ),
    hasCurrentAcademicYear: Boolean(currentYear),
    hasSections: coverage.sections > 0,
    hasStaff: teachers > 0,
    hasStudents: students > 0,
    hasTeacherAssignments: coverage.activeAssignments > 0,
  });

  return {
    school,
    currentYear,
    stats: {
      teachers,
      staff: staffMemberships || teachers,
      students,
      classes,
      sections: coverage.sections,
      subjects: coverage.offeredSubjects,
      teacherAssignments: coverage.activeAssignments,
      resources,
      pendingTeacherRequests,
      approvedBookAdoptions,
      pendingBookAdoptions,
      pendingClassTeachers: coverage.missingClassTeachers,
      pendingSubjectTeachers: coverage.missingSubjectTeachers,
    },
    recentStudents,
    recentAssignments,
    checklist,
  };
}

export async function getSchoolTeachers(query?: string) {
  const school = await requireSchool();
  const resourceScope = await getSchoolResourceScope(school.userId);
  return prisma.teacher.findMany({
    where: {
      schoolId: school.id,
      OR: query ? [
        { user: { name: { contains: query, mode: "insensitive" } } },
        { user: { email: { contains: query, mode: "insensitive" } } },
        { subject: { contains: query, mode: "insensitive" } },
        { classes: { contains: query, mode: "insensitive" } },
      ] : undefined,
    }, include: {
      user: true,
      assignments: { where: { active: true }, include: { schoolClass: true, section: true, subject: true }, orderBy: { createdAt: "asc" } },
      _count: {
        select: {
          downloads: { where: { resource: resourceScope?.where ?? { id: "" } } },
          bookmarks: { where: { resource: resourceScope?.where ?? { id: "" } } },
        },
      },
    }, orderBy: { user: { name: "asc" } },
  });
}

export async function getSchoolResources(filters: { query?: string; classLevel?: string; subject?: string; type?: ResourceType }) {
  const school=await requireSchool();const scope=await getSchoolResourceScope(school.userId);if(!scope)notFound();
  const where: Prisma.ResourceWhereInput = {
    ...scope.where, classLevel: filters.classLevel || undefined, subject: filters.subject || undefined, type: filters.type,
    OR: filters.query ? [
      { title: { contains: filters.query, mode: "insensitive" } },
      { description: { contains: filters.query, mode: "insensitive" } },
      { subject: { contains: filters.query, mode: "insensitive" } },
    ] : undefined,
  };
  const [resources, total, classes, subjects] = await prisma.$transaction([
    prisma.resource.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, description: true, subject: true, classLevel: true, type: true, book: { select: { title: true } } } }),
    prisma.resource.count({ where }),
    prisma.resource.findMany({ where:scope.where, distinct: ["classLevel"], select: { classLevel: true }, orderBy: { classLevel: "asc" } }),
    prisma.resource.findMany({ where:scope.where, distinct: ["subject"], select: { subject: true }, orderBy: { subject: "asc" } }),
  ]);
  return { resources, total, classes, subjects };
}

export async function getSchoolInspectionRequests() {
  const school = await requireSchool();
  return prisma.inspectionRequest.findMany({ where: { schoolId: school.id }, orderBy: { createdAt: "desc" } });
}

export async function getSchoolStaff(filters: {
  query?: string;
  role?: string;
  active?: "active" | "inactive";
} = {}) {
  const school = await requireSchool();
  const query = filters.query?.trim();
  const role = filters.role && Object.values(SchoolStaffRole).includes(filters.role as SchoolStaffRole)
    ? (filters.role as SchoolStaffRole)
    : undefined;
  const rows = await prisma.schoolStaffMembership.findMany({
    where: {
      schoolId: school.id,
      role,
      active: filters.active === "active" ? true : filters.active === "inactive" ? false : undefined,
      OR: query ? [
        { user: { name: { contains: query, mode: "insensitive" } } },
        { user: { email: { contains: query, mode: "insensitive" } } },
      ] : undefined,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          teacher: {
            select: {
              id: true,
              schoolId: true,
              active: true,
            },
          },
        },
      },
    },
    orderBy: [{ active: "desc" }, { user: { name: "asc" } }],
  });

  const memberships = rows.map((row) => ({
    id: row.id,
    role: row.role,
    active: row.active,
    joinedAt: row.joinedAt,
    userId: row.user.id,
    userName: row.user.name,
    userEmail: row.user.email,
    userRole: row.user.role,
    teacherId: row.user.teacher?.id ?? null,
    teacherSchoolId: row.user.teacher?.schoolId ?? null,
    teacherActive: row.user.teacher?.active ?? null,
  }));

  return { school, memberships };
}
