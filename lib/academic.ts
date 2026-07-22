import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { getSchoolResourceScope } from "@/lib/resource-audience";
import { bookCoverPath } from "@/lib/storage/book-asset-path";
import { normalizePositivePage } from "@/lib/school-academic-management";

const STUDENT_PAGE_SIZE = 60;

export async function getAcademicYears() {
  const school = await requireSchool();
  return prisma.academicYear.findMany({ where: { schoolId: school.id }, include: { _count: { select: { classes: true, enrollments: true } } }, orderBy: [{ current: "desc" }, { startDate: "desc" }] });
}

export async function getAcademicClassList(academicYearId?: string) {
  const school = await requireSchool();
  const years = await prisma.academicYear.findMany({ where: { schoolId: school.id }, orderBy: [{ current: "desc" }, { startDate: "desc" }] });
  const selectedYearId = years.some((year) => year.id === academicYearId) ? academicYearId : years.find((year) => year.current)?.id ?? years[0]?.id;
  const classes = selectedYearId ? await prisma.schoolClass.findMany({ where: { schoolId: school.id, academicYearId: selectedYearId }, include: { sections: { where: { active: true }, include: { teacherAssignments: { where: { active: true, type: "CLASS_TEACHER" }, take: 1, select: { teacher: { select: { user: { select: { name: true } } } } } }, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } }, orderBy: { name: "asc" } }, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }) : [];
  return { years, selectedYearId, classes };
}

export async function getAcademicClass(id: string) {
  const school = await requireSchool();
  const resourceScope=await getSchoolResourceScope(school.userId);if(!resourceScope)notFound();
  const [schoolClass, subjects, books, resources] = await Promise.all([
    prisma.schoolClass.findFirst({ where: { id, schoolId: school.id }, include: { academicYear: true, sections: { include: { subjects: { include: { subject: true, book: { include: { class: true, subject: true, series: true } }, resources: true }, orderBy: { sortOrder: "asc" } }, teacherAssignments: { where: { active: true }, include: { teacher: { include: { user: true } } } }, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } }, orderBy: { name: "asc" } } } }),
    prisma.subject.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.book.findMany({ where: { publisherId:school.publisherId,published: true }, include: { class: true, subject: true, series: true }, orderBy: { title: "asc" } }),
    prisma.resource.findMany({ where:{publisherId:resourceScope.school.publisherId,published:true}, orderBy: [{ type: "asc" }, { title: "asc" }] }),
  ]);
  if (!schoolClass) notFound();
  const classKey = normalizeAcademicName(schoolClass.name);
  return {
    schoolClass,
    subjects,
    books: books.filter((book) => normalizeAcademicName(book.class.name) === classKey).map((book) => ({ ...book, coverImage: bookCoverPath(book.id, book.coverImage) })),
    resources: resources.filter((resource) => normalizeAcademicName(resource.classLevel) === classKey),
  };
}

export function normalizeAcademicName(value: string) {
  return value.trim().toLowerCase().replace(/\b(class|grade|standard|std)\b/g, "").replace(/[^a-z0-9]+/g, "");
}

export async function getStudents(filters: {
  query?: string;
  academicYearId?: string;
  schoolClassId?: string;
  sectionId?: string;
  active?: "active" | "inactive";
  login?: "enabled" | "disabled";
  page?: string | number;
} = {}) {
  const school = await requireSchool();
  const query = filters.query?.trim();
  const page = normalizePositivePage(filters.page);
  const enrollmentScope = {
    academicYearId: filters.academicYearId || undefined,
    schoolClassId: filters.schoolClassId || undefined,
    sectionId: filters.sectionId || undefined,
  };
  const where = {
        schoolId: school.id,
        active: filters.active === "active" ? true : filters.active === "inactive" ? false : undefined,
        userId: filters.login === "enabled" ? { not: null } : filters.login === "disabled" ? null : undefined,
        OR: query ? [
          { name: { contains: query, mode: "insensitive" } },
          { admissionNumber: { contains: query, mode: "insensitive" } },
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ] : undefined,
        enrollments: (filters.academicYearId || filters.schoolClassId || filters.sectionId)
          ? {
              some: {
                ...enrollmentScope,
                schoolId: school.id,
                status: "ACTIVE",
              },
            }
          : undefined,
      } satisfies Prisma.StudentWhereInput;
  const [[students, total], years] = await Promise.all([
    prisma.$transaction([
      prisma.student.findMany({
      where,
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: { academicYear: true, schoolClass: true, section: true },
          orderBy: [{ joinedAt: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: (page - 1) * STUDENT_PAGE_SIZE,
      take: STUDENT_PAGE_SIZE,
      }),
      prisma.student.count({ where }),
    ]),
    prisma.academicYear.findMany({
      where: { schoolId: school.id, active: true },
      include: { classes: { where: { active: true }, include: { sections: { where: { active: true }, orderBy: { name: "asc" } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
      orderBy: [{ current: "desc" }, { startDate: "desc" }],
    }),
  ]);
  return { students, years, total, page, pageSize: STUDENT_PAGE_SIZE, pageCount: Math.max(1, Math.ceil(total / STUDENT_PAGE_SIZE)) };
}

export async function getStudent(id: string) {
  const school = await requireSchool();
  const [student, years] = await Promise.all([
    prisma.student.findFirst({ where: { id, schoolId: school.id }, include: { enrollments: { include: { academicYear: true, schoolClass: true, section: true }, orderBy: [{ joinedAt: "desc" }, { createdAt: "desc" }] } } }),
    prisma.academicYear.findMany({
      where: { schoolId: school.id, active: true },
      include: { classes: { where: { active: true }, include: { sections: { where: { active: true } } } } },
      orderBy: [{ current: "desc" }, { startDate: "desc" }],
    }),
  ]);
  if (!student) notFound();
  return { student, years };
}

export async function getTeacherAssignments() {
  const school = await requireSchool();
  const years = await prisma.academicYear.findMany({
      where: { schoolId: school.id, active: true, current: true },
      include: { classes: { where: { active: true }, include: { sections: { where: { active: true }, include: { subjects: { where: { active: true }, include: { subject: true } } } } } } },
      orderBy: [{ current: "desc" }, { startDate: "desc" }],
    });
  const academicYearId = years[0]?.id ?? "";
  const [assignments, teachers, memberships] = await Promise.all([
    prisma.teacherAssignment.findMany({ where: { schoolId: school.id, academicYearId, active: true }, include: { teacher: { include: { user: true } }, academicYear: true, schoolClass: true, section: true, subject: true }, orderBy: [{ schoolClass: { sortOrder: "asc" } }, { section: { name: "asc" } }] }),
    prisma.teacher.findMany({ where: { schoolId: school.id, active: true, status: "APPROVED" }, include: { user: true, assignments:{where:{active:true,academicYearId},include:{schoolClass:true,section:true,subject:true}} }, orderBy: { user: { name: "asc" } } }),
    prisma.schoolStaffMembership.findMany({
      where: { schoolId: school.id, role: "TEACHER" },
      select: { userId: true, active: true },
    }),
  ]);
  const membershipState = new Map<string, boolean>();
  for (const membership of memberships) {
    if (!membershipState.has(membership.userId)) {
      membershipState.set(membership.userId, membership.active);
      continue;
    }
    membershipState.set(membership.userId, membershipState.get(membership.userId) || membership.active);
  }
  const filteredTeachers = teachers.filter((teacher) => {
    if (!membershipState.has(teacher.userId)) return true;
    return Boolean(membershipState.get(teacher.userId));
  });
  return { assignments, teachers: filteredTeachers, years };
}
