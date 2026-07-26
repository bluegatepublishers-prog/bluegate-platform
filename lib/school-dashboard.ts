import { notFound } from "next/navigation";
import { PlatformFeatureKey, SchoolStaffRole, type Prisma, type ResourceType } from "@prisma/client";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getSchoolResourceScope } from "@/lib/resource-audience";
import { buildSchoolSetupChecklist } from "@/lib/school-setup-checklist";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";

export async function requireSchool() {
  const user = await requireUser(["SCHOOL"]);
  const school = await prisma.school.findFirst({ where: { userId: user.id, status: "APPROVED", publisher: { active: true } }, include: { user: true } });
  if (!school) notFound();
  return school;
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
    sections,
    classTeachers,
    sectionSubjects,
    subjectTeachers,
    resources,
    recentStudents,
    recentAssignments,
  ] = await prisma.$transaction([
    prisma.teacher.count({ where: { schoolId: school.id, active: true } }),
    prisma.schoolStaffMembership.count({ where: { schoolId: school.id, active: true } }),
    prisma.student.count({ where: { schoolId: school.id, active: true } }),
    prisma.schoolClass.count({
      where: { schoolId: school.id, academicYearId: currentYear?.id ?? "", active: true },
    }),
    prisma.classSection.count({
      where: {
        schoolClass: {
          schoolId: school.id,
          academicYearId: currentYear?.id ?? "",
          active: true,
        },
        active: true,
      },
    }),
    prisma.teacherAssignment.count({ where: { ...scope, type: "CLASS_TEACHER" } }),
    prisma.sectionSubject.count({
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
    }),
    prisma.teacherAssignment.count({ where: { ...scope, type: "SUBJECT_TEACHER" } }),
    prisma.resource.count({ where: resourceScope?.where ?? { id: "" } }),
    prisma.student.findMany({
      where: { schoolId: school.id },
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
      where: { schoolId: school.id, active: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        teacher: { select: { user: { select: { name: true } } } },
        schoolClass: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true } },
      },
    }),
  ]);

  const checklist = buildSchoolSetupChecklist({
    hasProfileBasics: Boolean(
      school.schoolName?.trim() &&
      school.city?.trim() &&
      school.state?.trim() &&
      school.user?.email?.trim(),
    ),
    hasCurrentAcademicYear: Boolean(currentYear),
    hasSections: sections > 0,
    hasStaff: teachers > 0,
    hasStudents: students > 0,
    hasTeacherAssignments: subjectTeachers > 0 || classTeachers > 0,
  });

  return {
    school,
    currentYear,
    stats: {
      teachers,
      staff: staffMemberships || teachers,
      students,
      classes,
      sections,
      resources,
      pendingClassTeachers: Math.max(0, sections - classTeachers),
      pendingSubjectTeachers: Math.max(0, sectionSubjects - subjectTeachers),
    },
    recentStudents,
    recentAssignments,
    checklist,
  };
}

export async function getSchoolTeachers(query?: string) {
  const school = await requireSchool();
  return prisma.teacher.findMany({
    where: {
      schoolId: school.id,
      OR: query ? [
        { user: { name: { contains: query, mode: "insensitive" } } },
        { user: { email: { contains: query, mode: "insensitive" } } },
        { assignments: { some: { active: true, subject: { name: { contains: query, mode: "insensitive" } } } } },
        { assignments: { some: { active: true, schoolClass: { name: { contains: query, mode: "insensitive" } } } } },
      ] : undefined,
    }, include: { user: true, assignments:{where:{active:true},include:{schoolClass:true,section:true,subject:true},orderBy:{createdAt:"asc"}} }, orderBy: { user: { name: "asc" } },
  });
}

export async function getSchoolResources(filters: { query?: string; classLevel?: string; subject?: string; type?: ResourceType }) {
  const school = await requireSchool();
  if (
    !school.publisherId ||
    !await isPublisherFeatureEnabled(school.publisherId, PlatformFeatureKey.RESOURCES)
  ) notFound();
  const catalogWhere: Prisma.ResourceWhereInput = {
    publisherId: school.publisherId,
    published: true,
  };
  const assignedWhere: Prisma.ResourceWhereInput = {
    ...catalogWhere,
    sectionSubjects: {
      some: {
        active: true,
        section: {
          active: true,
          schoolClass: {
            schoolId: school.id,
            active: true,
            academicYear: { active: true, current: true },
          },
        },
      },
    },
    classLevel: filters.classLevel || undefined, subject: filters.subject || undefined, type: filters.type,
    OR: filters.query ? [
      { title: { contains: filters.query, mode: "insensitive" } },
      { description: { contains: filters.query, mode: "insensitive" } },
      { subject: { contains: filters.query, mode: "insensitive" } },
    ] : undefined,
  };
  const [resources, catalog, classes, subjects, schoolClasses] = await prisma.$transaction([
    prisma.resource.findMany({ where: assignedWhere, orderBy: { createdAt: "desc" } }),
    prisma.resource.findMany({ where: catalogWhere, orderBy: [{ classLevel: "asc" }, { subject: "asc" }, { title: "asc" }] }),
    prisma.resource.findMany({ where: catalogWhere, distinct: ["classLevel"], select: { classLevel: true }, orderBy: { classLevel: "asc" } }),
    prisma.resource.findMany({ where: catalogWhere, distinct: ["subject"], select: { subject: true }, orderBy: { subject: "asc" } }),
    prisma.schoolClass.findMany({
      where: { schoolId: school.id, academicYear: { active: true, current: true }, active: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  return { resources, catalog, classes, subjects, schoolClasses };
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
