"use server";

import { EnrollmentStatus, PlatformFeatureKey, SecurityAuditOutcome, TeacherAssignmentType, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { cleanText, normalizeEmail, validEmail } from "@/lib/onboarding-policy";
import {
  buildAssignableBookWhere,
  buildAssignableResourcesWhere,
  buildSectionSubjectContentScopeWhere,
  buildSectionSubjectContentUpdate,
  isSectionSubjectContentSelectionValid,
} from "@/lib/section-subject-content-policy";
import { accountAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

const text = (form: FormData, key: string, max = 120) => String(form.get(key) ?? "").trim().slice(0, max);
const checked = (form: FormData, key: string) => form.get(key) === "on" || form.get(key) === "true";
const code = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
const positiveInt = (value: string) => { const parsed = Number.parseInt(value, 10); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; };
const cleaned = (form: FormData, key: string, max = 120) => cleanText(form.get(key), max);
const parsedDate = (value: string) => value ? new Date(value) : null;

function normalizedPhone(value: string, max = 30) {
  const compact = value.replace(/\s+/g, "").slice(0, max);
  if (!compact) return null;
  const cleanedValue = compact.replace(/[^\d+]/g, "");
  if (!cleanedValue) return null;
  if (cleanedValue.startsWith("+")) {
    const rest = cleanedValue.slice(1).replace(/\+/g, "");
    return rest ? `+${rest}` : null;
  }
  return cleanedValue.replace(/\+/g, "") || null;
}

function combineName(firstName: string, lastName: string, displayName: string) {
  if (displayName) return displayName;
  const full = `${firstName} ${lastName}`.trim();
  return full || firstName || lastName;
}

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

export async function saveSectionSubjectContent(schoolClassId: string, form: FormData) {
  const school = await requireSchool();
  if(!school.publisherId||!await isPublisherFeatureEnabled(school.publisherId,PlatformFeatureKey.RESOURCES))return;
  const sectionSubjectId = text(form, "sectionSubjectId");
  const bookId = text(form, "bookId") || null;
  const resourceIds = [...new Set(form.getAll("resourceIds").filter((value): value is string => typeof value === "string" && Boolean(value)))];
  const link = await prisma.sectionSubject.findFirst({
    where: buildSectionSubjectContentScopeWhere(school.id, schoolClassId, sectionSubjectId),
    include: { subject: true, section: { include: { schoolClass: true } } },
  });
  if (!link) return;
  const [book, resources] = await Promise.all([
    bookId ? prisma.book.findFirst({
      where: buildAssignableBookWhere(
        school.publisherId,
        school.id,
        link.section.schoolClass.academicYearId,
        link.id,
        bookId,
        link.subjectId,
      ),
      include: { class: true },
    }) : null,
    prisma.resource.findMany({ where: buildAssignableResourcesWhere(school.publisherId, resourceIds) }),
  ]);
  if (!isSectionSubjectContentSelectionValid({
    publisherId: school.publisherId,
    className: link.section.schoolClass.name,
    subjectId: link.subjectId,
    subjectName: link.subject.name,
    requestedBookId: bookId,
    requestedResourceIds: resourceIds,
    book,
    resources,
  })) return;
  await prisma.sectionSubject.update({
    where: { id: link.id },
    data: buildSectionSubjectContentUpdate(bookId, resources.map((resource) => resource.id)),
  });
  revalidatePath(`/school-dashboard/classes/${schoolClassId}`);
  revalidatePath("/school-dashboard/books");
  revalidatePath("/school-dashboard/resources");
  revalidatePath("/teacher-dashboard");
}

export async function assignApprovedBook(schoolClassId: string, form: FormData) {
  const school = await requireSchool();
  if (
    !school.publisherId ||
    !await isPublisherFeatureEnabled(
      school.publisherId,
      PlatformFeatureKey.BOOK_APPROVALS,
    )
  ) return;
  const sectionSubjectId = text(form, "sectionSubjectId");
  const bookId = text(form, "bookId") || null;
  const link = await prisma.sectionSubject.findFirst({
    where: buildSectionSubjectContentScopeWhere(
      school.id,
      schoolClassId,
      sectionSubjectId,
    ),
    include: {
      section: { include: { schoolClass: true } },
    },
  });
  if (!link) return;
  if (bookId) {
    const approved = await prisma.book.findFirst({
      where: buildAssignableBookWhere(
        school.publisherId,
        school.id,
        link.section.schoolClass.academicYearId,
        link.id,
        bookId,
        link.subjectId,
      ),
      select: { id: true },
    });
    if (!approved) return;
  }
  await prisma.sectionSubject.update({
    where: { id: link.id },
    data: { bookId },
  });
  revalidatePath("/school-dashboard/books");
  revalidatePath(`/school-dashboard/classes/${schoolClassId}`);
  revalidatePath("/teacher-dashboard");
  revalidatePath("/student-dashboard");
}

export async function createStudent(form: FormData) {
  const school = await requireSchool();
  const firstName = cleaned(form, "firstName", 80);
  const lastName = cleaned(form, "lastName", 80);
  const displayName = cleaned(form, "displayName", 120);
  const name = combineName(firstName, lastName, displayName);
  const admissionNumber = text(form, "admissionNumber", 50);
  const academicYearId = text(form, "academicYearId");
  const requestedClassId = text(form, "schoolClassId");
  const sectionId = text(form, "sectionId");
  const email = normalizeEmail(form.get("email"));
  const dobValue = cleaned(form, "dateOfBirth", 10);
  const dateOfBirth = parsedDate(dobValue);
  const guardianPhone = normalizedPhone(cleaned(form, "guardianPhone", 30));
  const joinDateValue = cleaned(form, "joinDate", 10);
  const joinDate = parsedDate(joinDateValue);
  const rollNumber = cleaned(form, "rollNumber", 30) || null;
  const section = await prisma.classSection.findFirst({
    where: {
      id: sectionId,
      active: true,
      schoolClass: {
        academicYearId,
        schoolId: school.id,
        active: true,
      },
    },
    include: {
      schoolClass: {
        select: {
          id: true,
          academicYearId: true,
        },
      },
    },
  });
  const today = new Date();
  if (
    !firstName ||
    !lastName ||
    !name ||
    !admissionNumber ||
    !guardianPhone ||
    !section ||
    Number.isNaN(joinDate?.valueOf()) ||
    !joinDate ||
    (dateOfBirth && (Number.isNaN(dateOfBirth.valueOf()) || dateOfBirth > today))
  ) return;
  if (section.schoolClass.id !== requestedClassId) return;
  if (email && !validEmail(email)) return;
  await prisma.$transaction(async (tx) => {
    const duplicateAdmission = await tx.student.findFirst({
      where: { schoolId: school.id, admissionNumber },
      select: { id: true },
    });
    if (duplicateAdmission) return;
    if (rollNumber) {
      const rollConflict = await tx.studentEnrollment.findFirst({
        where: {
          schoolId: school.id,
          sectionId,
          rollNumber,
          status: EnrollmentStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (rollConflict) return;
    }
    const student = await tx.student.create({
      data: {
        schoolId: school.id,
        admissionNumber,
        name,
        firstName,
        lastName,
        displayName: displayName || null,
        email: email || null,
        phone: normalizedPhone(cleaned(form, "studentPhone", 30)),
        guardianName: cleaned(form, "guardianName", 120) || null,
        guardianPhone,
        joinDate,
        dateOfBirth,
        gender: cleaned(form, "gender", 30) || null,
        active: checked(form, "active") || !form.has("active"),
      },
    });
    await tx.studentEnrollment.create({
      data: {
        studentId: student.id,
        schoolId: school.id,
        academicYearId,
        schoolClassId: section.schoolClass.id,
        sectionId,
        admissionNumber,
        activeSessionKey: `${student.id}:${academicYearId}`,
        rollNumber,
        status: EnrollmentStatus.ACTIVE,
        joinedAt: joinDate,
      },
    });
  });
  revalidatePath("/school-dashboard/students");
}

export async function updateStudent(studentId: string, form: FormData) {
  const school = await requireSchool();
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId: school.id } });
  const firstName = cleaned(form, "firstName", 80);
  const lastName = cleaned(form, "lastName", 80);
  const displayName = cleaned(form, "displayName", 120);
  const name = combineName(firstName, lastName, displayName) || cleaned(form, "name", 100);
  const email = normalizeEmail(form.get("email"));
  const dobValue = cleaned(form, "dateOfBirth", 10);
  const dateOfBirth = parsedDate(dobValue);
  if (!student || !name || !firstName || !lastName) return;
  if (email && !validEmail(email)) return;
  if (dateOfBirth && (Number.isNaN(dateOfBirth.valueOf()) || dateOfBirth > new Date())) return;
  await prisma.student.update({ where: { id: student.id }, data: { name, firstName, lastName, displayName: displayName || null, email: email || null, phone: normalizedPhone(cleaned(form, "studentPhone", 30)), guardianName: cleaned(form, "guardianName", 120) || null, guardianPhone: normalizedPhone(cleaned(form, "guardianPhone", 30)), joinDate: parsedDate(cleaned(form, "joinDate", 10)), dateOfBirth, gender: cleaned(form, "gender", 30) || null, active: checked(form, "active") } });
  revalidatePath(`/school-dashboard/students/${studentId}`);
  revalidatePath("/school-dashboard/students");
}

export async function changeStudentEnrollment(studentId: string, form: FormData) {
  const school = await requireSchool();
  const academicYearId = text(form, "academicYearId");
  const requestedClassId = text(form, "schoolClassId");
  const sectionId = text(form, "sectionId");
  const rollNumber = cleaned(form, "rollNumber", 30) || null;
  const movedOn = parsedDate(cleaned(form, "movedOn", 10)) ?? new Date();
  const [student, section] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, schoolId: school.id } }),
    prisma.classSection.findFirst({
      where: {
        id: sectionId,
        active: true,
        schoolClass: {
          schoolId: school.id,
          academicYearId,
          active: true,
        },
      },
      include: {
        schoolClass: {
          select: { id: true, academicYearId: true },
        },
      },
    }),
  ]);
  if (!student || !section || section.schoolClass.id !== requestedClassId || Number.isNaN(movedOn.valueOf())) return;
  await prisma.$transaction(async (tx) => {
    const currentActive = await tx.studentEnrollment.findFirst({
      where: {
        studentId,
        schoolId: school.id,
        academicYearId,
        status: EnrollmentStatus.ACTIVE,
      },
      orderBy: { joinedAt: "desc" },
    });
    if (rollNumber) {
      const rollConflict = await tx.studentEnrollment.findFirst({
        where: {
          schoolId: school.id,
          sectionId,
          rollNumber,
          status: EnrollmentStatus.ACTIVE,
          id: currentActive ? { not: currentActive.id } : undefined,
        },
        select: { id: true },
      });
      if (rollConflict) return;
    }
    if (currentActive) {
      await tx.studentEnrollment.update({
        where: { id: currentActive.id },
        data: {
          status: EnrollmentStatus.TRANSFERRED,
          leftAt: movedOn,
          activeSessionKey: null,
        },
      });
      await writeSecurityAuditEvent(tx, {
        actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
        action: "school.student.enrollment.close",
        targetType: "StudentEnrollment",
        targetId: currentActive.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { fromStatus: "ACTIVE", toStatus: "TRANSFERRED" },
      });
    }
    await tx.studentEnrollment.create({
      data: {
        studentId,
        schoolId: school.id,
        academicYearId,
        schoolClassId: section.schoolClass.id,
        sectionId,
        admissionNumber: student.admissionNumber,
        activeSessionKey: `${studentId}:${academicYearId}`,
        rollNumber,
        status: EnrollmentStatus.ACTIVE,
        joinedAt: movedOn,
      },
    });
  });
  revalidatePath(`/school-dashboard/students/${studentId}`);
  revalidatePath("/school-dashboard/students");
}

export async function moveStudentEnrollment(studentId: string, form: FormData) {
  return changeStudentEnrollment(studentId, form);
}

export async function setStudentActive(form: FormData) {
  const school = await requireSchool();
  const studentId = text(form, "studentId");
  const active = checked(form, "active");
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId: school.id }, select: { id: true } });
  if (!student) return;
  await prisma.student.update({ where: { id: student.id }, data: { active } });
  revalidatePath("/school-dashboard/students");
  revalidatePath(`/school-dashboard/students/${student.id}`);
}

export async function saveTeacherAssignment(form: FormData) {
  const school = await requireSchool();
  const teacherId = text(form, "teacherId");
  const sectionId = text(form, "sectionId");
  const academicYearId = text(form, "academicYearId");
  const type = text(form, "type") as TeacherAssignmentType;
  const subjectId = text(form, "subjectId") || null;
  const [teacher, section, sectionSubject, subject] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: teacherId, schoolId: school.id, active: true, status: "APPROVED" }, select: { id: true, userId: true } }),
    prisma.classSection.findFirst({ where: { id: sectionId, active: true, schoolClass: { schoolId: school.id, active: true, academicYear: { schoolId: school.id, active: true } } }, include: { schoolClass: true } }),
    subjectId ? prisma.sectionSubject.findFirst({ where: { sectionId, subjectId, active: true } }) : null,
    subjectId ? prisma.subject.findFirst({ where: { id: subjectId, active: true }, select: { id: true } }) : null,
  ]);
  if (!section || !Object.values(TeacherAssignmentType).includes(type) || (type === TeacherAssignmentType.SUBJECT_TEACHER && (!sectionSubject || !subject)) || (type === TeacherAssignmentType.CLASS_TEACHER && subjectId)) return;
  if (academicYearId && section.schoolClass.academicYearId !== academicYearId) return;
  if (!teacherId) {
    await prisma.teacherAssignment.updateMany({ where: { schoolId: school.id, sectionId, type, subjectId, active: true }, data: { active: false, endedAt: new Date() } });
    revalidatePath("/school-dashboard/teacher-assignments");
    return;
  }
  if (!teacher) return;
  const memberships = await prisma.schoolStaffMembership.findMany({
    where: { schoolId: school.id, userId: teacher.userId, role: "TEACHER", active: true, status: "ACTIVE" },
    select: { active: true },
    take: 1,
  });
  if (!memberships.length) return;
  await prisma.$transaction(async (tx) => {
    await tx.teacherAssignment.updateMany({ where: { schoolId: school.id, sectionId, type, subjectId, active: true }, data: { active: false, endedAt: new Date() } });
    const duplicate = await tx.teacherAssignment.findFirst({
      where: {
        schoolId: school.id,
        teacherId: teacher.id,
        sectionId,
        subjectId,
        type,
        active: true,
      },
      select: { id: true },
    });
    if (duplicate) return;
    await tx.teacherAssignment.create({ data: { teacherId, schoolId: school.id, academicYearId: section.schoolClass.academicYearId, schoolClassId: section.schoolClassId, sectionId, subjectId, type } });
  });
  revalidatePath("/school-dashboard/teacher-assignments");
}

export async function removeTeacherAssignment(form: FormData) {
  const school = await requireSchool();
  await prisma.teacherAssignment.updateMany({ where: { id: text(form, "id"), schoolId: school.id }, data: { active: false, endedAt: new Date() } });
  revalidatePath("/school-dashboard/teacher-assignments");
}
