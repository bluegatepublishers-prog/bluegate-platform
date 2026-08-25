import { notFound } from "next/navigation";
import { PlatformFeatureKey, SchoolStaffRole, type Prisma, type ResourceType } from "@prisma/client";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getSchoolResourceScope } from "@/lib/resource-audience";
import { buildSchoolSetupChecklist } from "@/lib/school-setup-checklist";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { getSchoolFeatureAccessForSchool, requireSchoolFeature } from "@/lib/school-feature-access";
import { decideSchoolAccess } from "@/lib/school-access-policy";

export class SchoolDashboardAccessError extends Error {}

export async function requireSchool() {
  const user = await requireUser(["SCHOOL"]);
  const school = await prisma.school.findFirst({ where: { userId: user.id, status: "APPROVED", publisher: { active: true } }, include: { user: true } });
  if (!school) notFound();
  const subscription = await prisma.schoolAccessSubscription.findUnique({
    where: { schoolId: school.id },
  });
  const decision = subscription && subscription.publisherId === school.publisherId
    ? decideSchoolAccess({ subscription, capability: "SCHOOL_DASHBOARD", role: "SCHOOL" })
    : { allowed: false as const, message: "School access is not configured for this institution." };
  if (!decision.allowed) throw new SchoolDashboardAccessError(decision.message);
  return school;
}

export async function getSchoolHomeData() {
  const school = await requireSchool();
  const currentYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, current: true, active: true },
    select: { id: true, name: true },
  });
  const yearId = currentYear?.id ?? "";
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [students, teachers, teacherAssignments, staff, classes, sections, planner, analytics, recentStudents, recentTeachers] = await prisma.$transaction([
    prisma.student.count({ where: { schoolId: school.id, active: true } }),
    prisma.teacher.count({ where: { schoolId: school.id, active: true } }),
    prisma.teacherAssignment.count({ where: { schoolId: school.id, active: true } }),
    prisma.schoolStaffMembership.count({ where: { schoolId: school.id, active: true, status: "ACTIVE" } }),
    prisma.schoolClass.count({ where: { schoolId: school.id, academicYearId: yearId, active: true } }),
    prisma.classSection.count({ where: { active: true, schoolClass: { schoolId: school.id, academicYearId: yearId, active: true } } }),
    prisma.academicPlannerItem.findMany({
      where: { schoolId: school.id, academicYearId: yearId, currentDate: { gte: start }, status: { notIn: ["CANCELLED", "SKIPPED"] } },
      include: { section: { include: { schoolClass: { select: { name: true } } } }, sectionSubject: { include: { subject: { select: { name: true } } } } },
      orderBy: { currentDate: "asc" }, take: 30,
    }),
    prisma.studentAnalytics.findMany({ where: { schoolId: school.id, academicYearId: yearId, averageAssessment: { not: null } }, select: { averageAssessment: true } }),
    prisma.student.findMany({ where: { schoolId: school.id }, select: { id: true, name: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.teacher.findMany({ where: { schoolId: school.id }, select: { id: true, user: { select: { name: true, createdAt: true } } }, orderBy: { user: { createdAt: "desc" } }, take: 4 }),
  ]);

  // When disabled, the home model intentionally returns attendance: null.
  let attendanceStats: {
    percentage: number | null;
    present: number;
    absent: number;
    pendingClasses: number;
    pendingCorrections: number;
  } = {
    percentage: null,
    present: 0,
    absent: 0,
    pendingClasses: 0,
    pendingCorrections: 0,
  };

  if (yearId && (await getSchoolFeatureAccessForSchool(school, "ATTENDANCE")).allowed) {
    const [todaySessions, pendingCorrectionsCount, sectionCount] = await prisma.$transaction([
      prisma.attendanceSession.findMany({
        where: {
          schoolId: school.id,
          academicYearId: yearId,
          date: { gte: start, lt: end },
          OR: [{ locked: true }, { submittedAt: { not: null } }],
        },
        include: { records: true },
      }),
      prisma.attendanceCorrection.count({
        where: {
          decisionStatus: "PENDING",
          attendanceRecord: { attendanceSession: { schoolId: school.id, academicYearId: yearId } },
        },
      }),
      prisma.classSection.count({
        where: {
          active: true,
          schoolClass: { schoolId: school.id, academicYearId: yearId, active: true },
        },
      }),
    ]);

    const records = todaySessions.flatMap((session) => session.records);
    const present = records.filter((row) => row.attendanceStatus === "PRESENT").length;
    const absent = records.filter((row) => row.attendanceStatus === "ABSENT").length;
    const weighted = records.reduce((sum, row) => sum + (row.attendanceStatus === "ABSENT" ? 0 : row.attendanceStatus === "HALF_DAY" ? 0.5 : 1), 0);
    const percentage = records.length ? Number(((weighted / records.length) * 100).toFixed(1)) : null;

    attendanceStats = {
      percentage,
      present,
      absent,
      pendingClasses: Math.max(0, sectionCount - new Set(todaySessions.map((session) => session.classSectionId)).size),
      pendingCorrections: pendingCorrectionsCount,
    };
  }
  const scores = analytics.flatMap((item) => item.averageAssessment == null ? [] : [item.averageAssessment]);
  return {
    checklist: buildSchoolSetupChecklist({
      hasProfileBasics: Boolean(school.schoolName?.trim() && school.city?.trim() && school.state?.trim() && school.user?.email?.trim()),
      hasCurrentAcademicYear: Boolean(currentYear),
      hasSections: sections > 0,
      hasStaff: teachers > 0 || staff > 0,
      hasStudents: students > 0,
      hasTeacherAssignments: teacherAssignments > 0,
    }),
    school, currentYear,
    stats: {
      students,
      staff: Math.max(teachers, staff),
      classes,
      sections,
      attendance: attendanceStats.percentage,
      attendancePresent: attendanceStats.present,
      attendanceAbsent: attendanceStats.absent,
      pendingClasses: attendanceStats.pendingClasses,
      pendingCorrections: attendanceStats.pendingCorrections,
    },
    today: planner.filter((item) => item.currentDate < end && !["NOTICE", "HOLIDAY", "EMERGENCY_HOLIDAY"].includes(item.type)).slice(0, 6),
    notices: planner.filter((item) => ["NOTICE", "HOLIDAY", "EMERGENCY_HOLIDAY"].includes(item.type)).slice(0, 4),
    upcoming: planner.slice(0, 8),
    performance: {
      measured: scores.length,
      excellent: scores.filter((score) => score >= 85).length,
      good: scores.filter((score) => score >= 70 && score < 85).length,
      average: scores.filter((score) => score >= 50 && score < 70).length,
      support: scores.filter((score) => score < 50).length,
    },
    activities: [
      ...recentStudents.map((item) => ({ id: `student-${item.id}`, text: `${item.name} joined the student directory`, at: item.createdAt })),
      ...recentTeachers.map((item) => ({ id: `teacher-${item.id}`, text: `${item.user.name} joined the teaching team`, at: item.user.createdAt })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 6),
  };
}

export async function getSchoolParents() {
  const school = await requireSchool();
  await requireSchoolFeature("PARENT_PORTAL");
  return prisma.parent.findMany({
    where: { relationships: { some: { student: { schoolId: school.id } } } },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      relationships: { where: { student: { schoolId: school.id } }, include: { student: { select: { id: true, name: true, admissionNumber: true } } }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export async function getSchoolPlannerData() {
  const school = await requireSchool();
  await requireSchoolFeature("PLANNER");
  const year = await prisma.academicYear.findFirst({ where: { schoolId: school.id, current: true, active: true }, select: { id: true, name: true } });
  const items = year ? await prisma.academicPlannerItem.findMany({
    where: { schoolId: school.id, academicYearId: year.id },
    include: { reschedules: { orderBy: { createdAt: "desc" } }, section: { include: { schoolClass: { select: { name: true } } } } },
    orderBy: { currentDate: "asc" }, take: 150,
  }) : [];
  return { school, year, items };
}

export async function getSchoolAcademicHub() {
  const school = await requireSchool();
  const years = await prisma.academicYear.findMany({ where: { schoolId: school.id }, select: { id: true, name: true, current: true, active: true, _count: { select: { classes: true, enrollments: true } } }, orderBy: { startDate: "desc" } });
  const yearId = years.find((item) => item.current)?.id ?? years[0]?.id ?? "";
  const [classes, subjects, assignments, books, resources] = await prisma.$transaction([
    prisma.schoolClass.findMany({ where: { schoolId: school.id, academicYearId: yearId, active: true }, include: { sections: { where: { active: true }, select: { id: true, name: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.sectionSubject.findMany({ where: { active: true, section: { active: true, schoolClass: { schoolId: school.id, academicYearId: yearId, active: true } } }, include: { subject: { select: { id: true, name: true } }, section: { include: { schoolClass: { select: { name: true } } } } }, orderBy: { subject: { name: "asc" } } }),
    prisma.teacherAssignment.count({ where: { schoolId: school.id, academicYearId: yearId, active: true } }),
    prisma.schoolBookEntitlement.count({ where: { schoolId: school.id, status: "ACTIVE" } }),
    prisma.schoolResourceEntitlement.count({ where: { schoolId: school.id, status: "ACTIVE" } }),
  ]);
  const uniqueSubjects = [...new Map(subjects.map((item) => [item.subject.id, item.subject])).values()];
  return { school, years, classes, subjects: uniqueSubjects, subjectLinks: subjects.length, assignments, books, resources };
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
  const teachers = await prisma.teacher.findMany({
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
  return teachers.map((teacher) => ({ ...teacher, user: { ...teacher.user, email: teacher.user.email ?? "" } }));
}

export async function getSchoolResources(filters: { query?: string; classLevel?: string; subject?: string; type?: ResourceType }) {
  const school = await requireSchool();
  if (
    !school.publisherId ||
    !await isPublisherFeatureEnabled(school.publisherId, PlatformFeatureKey.RESOURCES)
  ) return { resources: [], catalog: [], classes: [], subjects: [], schoolClasses: [] };
  const catalogWhere: Prisma.ResourceWhereInput = {
    publisherId: school.publisherId,
    published: true,
    archived: false,
    schoolEntitlements: { some: { schoolId: school.id, publisherId: school.publisherId, status: "ACTIVE" } },
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
