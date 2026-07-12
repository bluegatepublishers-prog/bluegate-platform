import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";

export async function getAcademicYears() {
  const school = await requireSchool();
  return prisma.academicYear.findMany({ where: { schoolId: school.id }, include: { _count: { select: { classes: true, enrollments: true } } }, orderBy: [{ current: "desc" }, { startDate: "desc" }] });
}

export async function getAcademicClassList(academicYearId?: string) {
  const school = await requireSchool();
  const years = await prisma.academicYear.findMany({ where: { schoolId: school.id }, orderBy: [{ current: "desc" }, { startDate: "desc" }] });
  const selectedYearId = years.some((year) => year.id === academicYearId) ? academicYearId : years.find((year) => year.current)?.id ?? years[0]?.id;
  const classes = selectedYearId ? await prisma.schoolClass.findMany({ where: { schoolId: school.id, academicYearId: selectedYearId }, include: { sections: { orderBy: { name: "asc" } }, _count: { select: { enrollments: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }) : [];
  return { years, selectedYearId, classes };
}

export async function getAcademicClass(id: string) {
  const school = await requireSchool();
  const [schoolClass, subjects, books, resources] = await Promise.all([
    prisma.schoolClass.findFirst({ where: { id, schoolId: school.id }, include: { academicYear: true, sections: { include: { subjects: { include: { subject: true, book: { include: { class: true, subject: true, series: true } }, resources: true }, orderBy: { sortOrder: "asc" } }, teacherAssignments: { where: { active: true, type: "SUBJECT_TEACHER" }, include: { teacher: { include: { user: true } } } }, _count: { select: { enrollments: true } } }, orderBy: { name: "asc" } } } }),
    prisma.subject.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.book.findMany({ where: { published: true }, include: { class: true, subject: true, series: true }, orderBy: { title: "asc" } }),
    prisma.resource.findMany({ where: { published: true }, orderBy: [{ type: "asc" }, { title: "asc" }] }),
  ]);
  if (!schoolClass) notFound();
  const classKey = normalizeAcademicName(schoolClass.name);
  return {
    schoolClass,
    subjects,
    books: books.filter((book) => normalizeAcademicName(book.class.name) === classKey),
    resources: resources.filter((resource) => normalizeAcademicName(resource.classLevel) === classKey),
  };
}

export function normalizeAcademicName(value: string) {
  return value.trim().toLowerCase().replace(/\b(class|grade|standard|std)\b/g, "").replace(/[^a-z0-9]+/g, "");
}

export async function getStudents(query?: string) {
  const school = await requireSchool();
  const [students, years] = await Promise.all([
    prisma.student.findMany({ where: { schoolId: school.id, OR: query ? [{ name: { contains: query, mode: "insensitive" } }, { admissionNumber: { contains: query, mode: "insensitive" } }] : undefined }, include: { enrollments: { include: { academicYear: true, schoolClass: true, section: true }, orderBy: { academicYear: { startDate: "desc" } }, take: 1 } }, orderBy: { name: "asc" } }),
    prisma.academicYear.findMany({
      where: { schoolId: school.id, active: true },
      include: { classes: { where: { active: true }, include: { sections: { where: { active: true }, orderBy: { name: "asc" } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
      orderBy: [{ current: "desc" }, { startDate: "desc" }],
    }),
  ]);
  return { students, years };
}

export async function getStudent(id: string) {
  const school = await requireSchool();
  const [student, years] = await Promise.all([
    prisma.student.findFirst({ where: { id, schoolId: school.id }, include: { enrollments: { include: { academicYear: true, schoolClass: true, section: true }, orderBy: { academicYear: { startDate: "desc" } } } } }),
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
  const [assignments, teachers, years] = await Promise.all([
    prisma.teacherAssignment.findMany({ where: { schoolId: school.id, active: true }, include: { teacher: { include: { user: true } }, academicYear: true, schoolClass: true, section: true, subject: true }, orderBy: [{ academicYear: { startDate: "desc" } }, { schoolClass: { sortOrder: "asc" } }] }),
    prisma.teacher.findMany({ where: { schoolId: school.id,active:true }, include: { user: true,assignments:{where:{active:true},include:{schoolClass:true,section:true,subject:true}} }, orderBy: { user: { name: "asc" } } }),
    prisma.academicYear.findMany({
      where: { schoolId: school.id, active: true, current: true },
      include: { classes: { where: { active: true }, include: { sections: { where: { active: true }, include: { subjects: { where: { active: true }, include: { subject: true } } } } } } },
      orderBy: [{ current: "desc" }, { startDate: "desc" }],
    }),
  ]);
  return { assignments, teachers, years };
}
