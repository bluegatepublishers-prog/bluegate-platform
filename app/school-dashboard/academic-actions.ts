"use server";

import { EnrollmentStatus, TeacherAssignmentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";

const text = (form: FormData, key: string, max = 120) => String(form.get(key) ?? "").trim().slice(0, max);
const checked = (form: FormData, key: string) => form.get(key) === "on" || form.get(key) === "true";
const code = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
const positiveInt = (value: string) => { const parsed = Number.parseInt(value, 10); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; };

export async function saveAcademicYear(form: FormData) {
  const school = await requireSchool();
  const id = text(form, "id");
  const name = text(form, "name", 30);
  const startDate = new Date(text(form, "startDate", 10));
  const endDate = new Date(text(form, "endDate", 10));
  const current = checked(form, "current");
  if (!name || Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf()) || startDate >= endDate) return;
  if (id && !await prisma.academicYear.findFirst({ where: { id, schoolId: school.id }, select: { id: true } })) return;
  await prisma.$transaction(async (tx) => {
    if (current) await tx.academicYear.updateMany({ where: { schoolId: school.id, current: true }, data: { current: false } });
    if (id) {
      await tx.academicYear.updateMany({ where: { id, schoolId: school.id }, data: { name, startDate, endDate, active: checked(form, "active"), current } });
    } else {
      await tx.academicYear.create({ data: { schoolId: school.id, name, startDate, endDate, current } });
    }
  });
  revalidatePath("/school-dashboard/academic-years");
}

export async function setCurrentAcademicYear(form: FormData) {
  const school = await requireSchool();
  const id = text(form, "id");
  const year = await prisma.academicYear.findFirst({ where: { id, schoolId: school.id, active: true } });
  if (!year) return;
  await prisma.$transaction([
    prisma.academicYear.updateMany({ where: { schoolId: school.id, current: true }, data: { current: false } }),
    prisma.academicYear.update({ where: { id: year.id }, data: { current: true } }),
  ]);
  revalidatePath("/school-dashboard/academic-years");
  revalidatePath("/school-dashboard/classes");
}

export async function createSchoolClass(form: FormData) {
  const school = await requireSchool();
  const academicYearId = text(form, "academicYearId");
  const name = text(form, "name", 60);
  const year = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId: school.id } });
  if (!year || !name) return;
  await prisma.schoolClass.upsert({
    where: { academicYearId_code: { academicYearId, code: code(name) } },
    update: { name, active: true },
    create: { schoolId: school.id, academicYearId, name, code: code(name), sortOrder: positiveInt(text(form, "sortOrder")) ?? 0 },
  });
  revalidatePath("/school-dashboard/classes");
}

export async function addStandardClasses(form: FormData) {
  const school = await requireSchool();
  const academicYearId = text(form, "academicYearId");
  const year = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId: school.id } });
  if (!year) return;
  const names = ["Nursery", "KG", ...Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`)];
  await prisma.$transaction(names.map((name, index) => prisma.schoolClass.upsert({
    where: { academicYearId_code: { academicYearId, code: code(name) } }, update: {},
    create: { schoolId: school.id, academicYearId, name, code: code(name), sortOrder: index + 1 },
  })));
  revalidatePath("/school-dashboard/classes");
}

export async function saveSection(schoolClassId: string, form: FormData) {
  const school = await requireSchool();
  const id = text(form, "id");
  const name = text(form, "name", 30);
  const schoolClass = await prisma.schoolClass.findFirst({ where: { id: schoolClassId, schoolId: school.id } });
  if (!schoolClass || !name) return;
  const data = { name, code: code(name), room: text(form, "room", 40) || null, capacity: positiveInt(text(form, "capacity")), active: form.has("active") ? checked(form, "active") : true };
  if (id) await prisma.classSection.updateMany({ where: { id, schoolClassId }, data });
  else await prisma.classSection.upsert({ where: { schoolClassId_code: { schoolClassId, code: data.code } }, update: { ...data, active: true }, create: { schoolClassId, ...data } });
  revalidatePath(`/school-dashboard/classes/${schoolClassId}`);
}

export async function toggleSectionSubject(schoolClassId: string, form: FormData) {
  const school = await requireSchool();
  const sectionId = text(form, "sectionId");
  const subjectId = text(form, "subjectId");
  const section = await prisma.classSection.findFirst({ where: { id: sectionId, schoolClass: { id: schoolClassId, schoolId: school.id } } });
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, active: true } });
  if (!section || !subject) return;
  await prisma.sectionSubject.upsert({ where: { sectionId_subjectId: { sectionId, subjectId } }, update: { active: checked(form, "active") }, create: { sectionId, subjectId, active: true } });
  revalidatePath(`/school-dashboard/classes/${schoolClassId}`);
}

export async function setSectionSubjectOrder(schoolClassId: string, form: FormData) {
  const school = await requireSchool();
  const sectionSubjectId = text(form, "sectionSubjectId");
  const sortOrder = positiveInt(text(form, "sortOrder")) ?? 0;
  const link = await prisma.sectionSubject.findFirst({ where: { id: sectionSubjectId, section: { schoolClass: { id: schoolClassId, schoolId: school.id } } } });
  if (!link) return;
  await prisma.sectionSubject.update({ where: { id: link.id }, data: { sortOrder } });
  revalidatePath(`/school-dashboard/classes/${schoolClassId}`);
}

export async function createStudent(form: FormData) {
  const school = await requireSchool();
  const name = text(form, "name", 100);
  const admissionNumber = text(form, "admissionNumber", 50);
  const academicYearId = text(form, "academicYearId");
  const schoolClassId = text(form, "schoolClassId");
  const sectionId = text(form, "sectionId");
  const section = await prisma.classSection.findFirst({ where: { id: sectionId, schoolClass: { id: schoolClassId, academicYearId, schoolId: school.id } } });
  if (!name || !admissionNumber || !section) return;
  await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({ data: { schoolId: school.id, name, admissionNumber, email: text(form, "email", 254).toLowerCase() || null } });
    await tx.studentEnrollment.create({ data: { studentId: student.id, schoolId: school.id, academicYearId, schoolClassId, sectionId, rollNumber: text(form, "rollNumber", 30) || null } });
  });
  revalidatePath("/school-dashboard/students");
}

export async function updateStudent(studentId: string, form: FormData) {
  const school = await requireSchool();
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId: school.id } });
  const name = text(form, "name", 100);
  if (!student || !name) return;
  await prisma.student.update({ where: { id: student.id }, data: { name, email: text(form, "email", 254).toLowerCase() || null, dateOfBirth: text(form, "dateOfBirth") ? new Date(text(form, "dateOfBirth")) : null, gender: text(form, "gender", 30) || null, active: checked(form, "active") } });
  revalidatePath(`/school-dashboard/students/${studentId}`);
  revalidatePath("/school-dashboard/students");
}

export async function changeStudentEnrollment(studentId: string, form: FormData) {
  const school = await requireSchool();
  const academicYearId = text(form, "academicYearId");
  const schoolClassId = text(form, "schoolClassId");
  const sectionId = text(form, "sectionId");
  const [student, section] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, schoolId: school.id } }),
    prisma.classSection.findFirst({ where: { id: sectionId, schoolClass: { id: schoolClassId, academicYearId, schoolId: school.id } } }),
  ]);
  if (!student || !section) return;
  await prisma.studentEnrollment.upsert({ where: { studentId_academicYearId: { studentId, academicYearId } }, update: { schoolId: school.id, schoolClassId, sectionId, rollNumber: text(form, "rollNumber", 30) || null, status: EnrollmentStatus.ACTIVE, leftAt: null }, create: { studentId, schoolId: school.id, academicYearId, schoolClassId, sectionId, rollNumber: text(form, "rollNumber", 30) || null } });
  revalidatePath(`/school-dashboard/students/${studentId}`);
}

export async function saveTeacherAssignment(form: FormData) {
  const school = await requireSchool();
  const teacherId = text(form, "teacherId");
  const sectionId = text(form, "sectionId");
  const type = text(form, "type") as TeacherAssignmentType;
  const subjectId = text(form, "subjectId") || null;
  const [teacher, section, sectionSubject] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: teacherId, schoolId: school.id } }),
    prisma.classSection.findFirst({ where: { id: sectionId, schoolClass: { schoolId: school.id } }, include: { schoolClass: true } }),
    subjectId ? prisma.sectionSubject.findFirst({ where: { sectionId, subjectId, active: true } }) : null,
  ]);
  if (!teacher || !section || !Object.values(TeacherAssignmentType).includes(type) || (type === TeacherAssignmentType.SUBJECT_TEACHER && !sectionSubject) || (type === TeacherAssignmentType.CLASS_TEACHER && subjectId)) return;
  await prisma.$transaction(async (tx) => {
    await tx.teacherAssignment.updateMany({ where: { schoolId: school.id, sectionId, type, subjectId, active: true }, data: { active: false } });
    await tx.teacherAssignment.create({ data: { teacherId, schoolId: school.id, academicYearId: section.schoolClass.academicYearId, schoolClassId: section.schoolClassId, sectionId, subjectId, type } });
  });
  revalidatePath("/school-dashboard/teacher-assignments");
}

export async function removeTeacherAssignment(form: FormData) {
  const school = await requireSchool();
  await prisma.teacherAssignment.updateMany({ where: { id: text(form, "id"), schoolId: school.id }, data: { active: false } });
  revalidatePath("/school-dashboard/teacher-assignments");
}
