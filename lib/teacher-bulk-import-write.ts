import "server-only";

import { randomBytes } from "node:crypto";
import { Prisma, SchoolStaffMembershipStatus, SchoolStaffRole, SecurityAuditOutcome, TeacherAssignmentType, UserRole } from "@prisma/client";

import { parseTeacherBulkWorkbook, validateTeacherBulkRows } from "@/lib/teacher-bulk-import";
import { TEACHER_BULK_FILE_MESSAGE, type TeacherBulkExistingAssignment, type TeacherBulkExistingUser, type TeacherBulkExistingTeacher, type TeacherBulkHierarchyYear, type TeacherBulkParsedAssignmentRow, type TeacherBulkParsedTeacherRow, type TeacherBulkPreview, type TeacherBulkValidationContext } from "@/lib/teacher-bulk-import-contract";
import { issueSchoolTeacherActivation } from "@/lib/school-teacher-activation";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { accountAuditActor, recordTrustedAuditBestEffort } from "@/lib/security-audit";

const IDENTITY_BATCH_SIZE = 25;

type ImportSchool = { id: string; schoolName: string; publisherId: string | null; userId: string };
type TeacherResultStatus = "CREATED" | "EXISTING" | "FAILED";
type AssignmentResultStatus = "CREATED" | "EXISTING" | "FAILED";

export type TeacherBulkImportResult = {
  ok: true;
  teacherSummary: { total: number; created: number; existing: number; failed: number; invitationSent: number; invitationFailed: number };
  assignmentSummary: { total: number; created: number; existing: number; failed: number };
  teachers: Array<{ excelRow: number; teacherName: string; email: string; status: TeacherResultStatus; message: string }>;
  assignments: Array<{ excelRow: number; teacherEmail: string; status: AssignmentResultStatus; message: string }>;
  notice: "Import Complete";
};

export async function importTeacherBulkWorkbook(input: { school: ImportSchool; bytes: Uint8Array; fileName: string }): Promise<TeacherBulkImportResult | { ok: false; error: string }> {
  const parsed = await parseTeacherBulkWorkbook(input.bytes, input.fileName);
  if (!parsed.ok) return parsed;
  const emails = [...new Set([...parsed.teachers.map((row) => row.fields.email), ...parsed.assignments.map((row) => row.fields.teacherEmail)].filter(Boolean))];
  const context = await loadValidationContext(input.school.id, emails);
  const preview = validateTeacherBulkRows(parsed.teachers, parsed.assignments, context);
  const teacherResults = new Map<number, TeacherBulkImportResult["teachers"][number]>();
  const assignmentResults = new Map<number, TeacherBulkImportResult["assignments"][number]>();
  const teacherIds = new Map<string, string>();
  for (const teacher of context.teachers) teacherIds.set(normalizeEmail(teacher.email), teacher.id);
  let invitationSent = 0;
  let invitationFailed = 0;

  for (let offset = 0; offset < parsed.teachers.length; offset += IDENTITY_BATCH_SIZE) {
    const batch = parsed.teachers.slice(offset, offset + IDENTITY_BATCH_SIZE);
    for (const parsedTeacher of batch) {
      const previewRow = preview.teachers.find((row) => row.excelRow === parsedTeacher.excelRow);
      const email = parsedTeacher.fields.email;
      if (!previewRow || previewRow.status === "ERROR" || !email) {
        teacherResults.set(parsedTeacher.excelRow, { excelRow: parsedTeacher.excelRow, teacherName: parsedTeacher.fields.teacherName, email, status: "FAILED", message: previewRow?.messages.join(" ") || "Teacher row failed validation." });
        continue;
      }
      const existing = context.teachers.find((teacher) => normalizeEmail(teacher.email) === email);
      if (existing) {
        teacherIds.set(email, existing.id);
        teacherResults.set(parsedTeacher.excelRow, { excelRow: parsedTeacher.excelRow, teacherName: parsedTeacher.fields.teacherName, email, status: "EXISTING", message: "Existing · Profile unchanged" });
        continue;
      }
      try {
        const identity = await createTeacherIdentity(input.school, parsedTeacher.fields);
        teacherIds.set(email, identity.teacherId);
        if (!identity.created) {
          teacherResults.set(parsedTeacher.excelRow, { excelRow: parsedTeacher.excelRow, teacherName: parsedTeacher.fields.teacherName, email, status: "EXISTING", message: "Existing · Profile unchanged" });
          continue;
        }
        let sent = false;
        try { sent = await issueSchoolTeacherActivation({ id: identity.userId, email }, input.school.schoolName); } catch { sent = false; }
        if (sent) invitationSent += 1;
        else invitationFailed += 1;
        teacherResults.set(parsedTeacher.excelRow, { excelRow: parsedTeacher.excelRow, teacherName: parsedTeacher.fields.teacherName, email, status: "CREATED", message: sent ? "Created · Activation invitation sent" : "Created · Invitation could not be sent" });
      } catch (error) {
        teacherResults.set(parsedTeacher.excelRow, { excelRow: parsedTeacher.excelRow, teacherName: parsedTeacher.fields.teacherName, email, status: "FAILED", message: safeImportError(error) });
      }
    }
  }

  const assignmentGroups = new Map<string, TeacherBulkParsedAssignmentRow[]>();
  for (const row of parsed.assignments) assignmentGroups.set(row.fields.teacherEmail, [...(assignmentGroups.get(row.fields.teacherEmail) ?? []), row]);
  for (const [email, rows] of assignmentGroups) {
    const teacherId = teacherIds.get(email);
    const readyRows = rows.filter((row) => preview.assignments.find((item) => item.excelRow === row.excelRow)?.status === "READY");
    for (const row of rows) {
      const previewRow = preview.assignments.find((item) => item.excelRow === row.excelRow);
      if (previewRow?.status === "EXISTING") assignmentResults.set(row.excelRow, { excelRow: row.excelRow, teacherEmail: email, status: "EXISTING", message: "Existing · Assignment skipped" });
      else if (previewRow?.status === "ERROR" || !teacherId) assignmentResults.set(row.excelRow, { excelRow: row.excelRow, teacherEmail: email, status: "FAILED", message: previewRow?.messages.join(" ") || "Teacher identity was not created." });
    }
    if (!teacherId || !readyRows.length) continue;
    try {
      const createdRows = await createTeacherAssignments(input.school, teacherId, readyRows);
      for (const row of readyRows) assignmentResults.set(row.excelRow, { excelRow: row.excelRow, teacherEmail: email, status: createdRows.has(row.excelRow) ? "CREATED" : "EXISTING", message: createdRows.has(row.excelRow) ? "Created" : "Existing · Assignment skipped" });
    } catch (error) {
      for (const row of readyRows) assignmentResults.set(row.excelRow, { excelRow: row.excelRow, teacherEmail: email, status: "FAILED", message: safeImportError(error) });
    }
  }

  const teachers = parsed.teachers.map((row) => teacherResults.get(row.excelRow) ?? { excelRow: row.excelRow, teacherName: row.fields.teacherName, email: row.fields.email, status: "FAILED" as const, message: "Teacher row was not processed." });
  const assignments = parsed.assignments.map((row) => assignmentResults.get(row.excelRow) ?? { excelRow: row.excelRow, teacherEmail: row.fields.teacherEmail, status: "FAILED" as const, message: "Assignment row was not processed." });
  const teacherSummary = { total: teachers.length, created: teachers.filter((row) => row.status === "CREATED").length, existing: teachers.filter((row) => row.status === "EXISTING").length, failed: teachers.filter((row) => row.status === "FAILED").length, invitationSent, invitationFailed };
  const assignmentSummary = { total: assignments.length, created: assignments.filter((row) => row.status === "CREATED").length, existing: assignments.filter((row) => row.status === "EXISTING").length, failed: assignments.filter((row) => row.status === "FAILED").length };
  await recordTrustedAuditBestEffort({ actor: accountAuditActor({ id: input.school.userId, role: UserRole.SCHOOL, publisherId: input.school.publisherId }), action: "school.teacher.bulk_import", targetType: "School", targetId: input.school.id, outcome: SecurityAuditOutcome.SUCCESS, metadata: { scope: "teacher_bulk_import", requestedCount: teacherSummary.total, activatedCount: invitationSent, alreadyActiveCount: teacherSummary.existing, failedCount: teacherSummary.failed + assignmentSummary.failed, resultCount: teacherSummary.created + assignmentSummary.created } });
  return { ok: true, teacherSummary, assignmentSummary, teachers, assignments, notice: "Import Complete" };
}

async function createTeacherIdentity(school: ImportSchool, fields: { teacherName: string; email: string; phone: string; designation: string }) {
  return withSerializable(async (tx) => {
    const currentSchool = await tx.school.findFirst({ where: { id: school.id, status: "APPROVED", publisher: { active: true } }, select: { id: true } });
    if (!currentSchool) throw new Error("School access is no longer active.");
    const existingUser = await tx.user.findFirst({ where: { email: { equals: fields.email, mode: "insensitive" } }, select: { id: true, email: true, role: true, teacher: { select: { id: true, schoolId: true } } } });
    if (existingUser) {
      if (existingUser.role === UserRole.TEACHER && existingUser.teacher?.schoolId === school.id) return { created: false as const, userId: existingUser.id, teacherId: existingUser.teacher.id };
      throw new Error("This email is already in use by another account.");
    }
    const password = await hashPassword(randomBytes(32).toString("base64url"));
    const user = await tx.user.create({ data: { name: fields.teacherName, email: fields.email, password, role: UserRole.TEACHER, publisherId: school.publisherId, phone: fields.phone || null, mustChangePassword: true } });
    const teacher = await tx.teacher.create({ data: { userId: user.id, schoolId: school.id, schoolName: school.schoolName, designation: fields.designation || "Teacher", subject: "Assigned through school", classes: "Assigned through school", verified: true, active: true, status: "APPROVED" } });
    await tx.schoolStaffMembership.create({ data: { schoolId: school.id, userId: user.id, teacherId: teacher.id, role: SchoolStaffRole.TEACHER, status: SchoolStaffMembershipStatus.ACTIVE, active: true, activeKey: `${school.id}:${user.id}`, joinedAt: new Date() } });
    return { created: true as const, userId: user.id, teacherId: teacher.id };
  });
}

async function createTeacherAssignments(school: ImportSchool, teacherId: string, rows: TeacherBulkParsedAssignmentRow[]) {
  return withSerializable(async (tx) => {
    const teacher = await tx.teacher.findFirst({ where: { id: teacherId, schoolId: school.id, active: true, status: "APPROVED", schoolMemberships: { some: { schoolId: school.id, active: true, status: SchoolStaffMembershipStatus.ACTIVE } } }, select: { id: true } });
    if (!teacher) throw new Error("Teacher is no longer eligible for assignment management.");
    const years = await tx.academicYear.findMany({
      where: { schoolId: school.id, active: true },
      select: {
        id: true,
        name: true,
        active: true,
        current: true,
        classes: {
          select: {
            id: true,
            academicYearId: true,
            code: true,
            name: true,
            active: true,
            sections: {
              select: {
                id: true,
                schoolClassId: true,
                code: true,
                name: true,
                active: true,
                subjects: { select: { id: true, subjectId: true, active: true, subject: { select: { id: true, code: true, name: true, active: true } } } },
              },
            },
          },
        },
      },
    });
    const resolved = rows.map((row) => resolveWriteHierarchy(row, years));
    const activeAssignments = await tx.teacherAssignment.findMany({ where: { schoolId: school.id, active: true, academicYearId: { in: [...new Set(resolved.map((item) => item.year.id))] }, sectionId: { in: [...new Set(resolved.map((item) => item.section.id))] } }, select: { teacherId: true, academicYearId: true, schoolClassId: true, sectionId: true, subjectId: true, type: true } });
    const activeKeys = new Set(activeAssignments.map((assignment) => assignmentKey(assignment.teacherId, assignment.academicYearId, assignment.schoolClassId, assignment.sectionId, assignment.subjectId, assignment.type)));
    const data: Array<{ teacherId: string; schoolId: string; academicYearId: string; schoolClassId: string; sectionId: string; subjectId: string | null; type: TeacherAssignmentType }> = [];
    const createdRows = new Set<number>();
    for (const item of resolved) {
      const key = assignmentKey(teacherId, item.year.id, item.schoolClass.id, item.section.id, item.subject?.id ?? null, item.type);
      if (activeKeys.has(key)) continue;
      const conflicting = activeAssignments.some((assignment) => assignment.academicYearId === item.year.id && assignment.schoolClassId === item.schoolClass.id && assignment.sectionId === item.section.id && assignment.subjectId === (item.subject?.id ?? null) && assignment.type === item.type && assignment.teacherId !== teacherId);
      if (conflicting) throw new Error("A different Teacher already has this active assignment.");
      activeKeys.add(key);
      data.push({ teacherId, schoolId: school.id, academicYearId: item.year.id, schoolClassId: item.schoolClass.id, sectionId: item.section.id, subjectId: item.subject?.id ?? null, type: item.type });
      createdRows.add(item.row.excelRow);
    }
    if (data.length) await tx.teacherAssignment.createMany({ data });
    return createdRows;
  });
}

function resolveWriteHierarchy(row: TeacherBulkParsedAssignmentRow, years: Array<{ id: string; name: string; active: boolean; current: boolean; classes: Array<{ id: string; academicYearId: string; code: string; name: string; active: boolean; sections: Array<{ id: string; schoolClassId: string; code: string; name: string; active: boolean; subjects: Array<{ id: string; subjectId: string; active: boolean; subject: { id: string; code: string; name: string; active: boolean } }> }> }> }>) {
  const year = years.find((candidate) => sameKey(candidate.name, row.fields.academicYear));
  const schoolClass = year?.classes.find((candidate) => candidate.active && sameKey(candidate.code, row.fields.classCode));
  const section = schoolClass?.sections.find((candidate) => candidate.active && sameKey(candidate.code, row.fields.sectionCode));
  const type = row.fields.assignmentType as TeacherAssignmentType;
  const sectionSubject = type === TeacherAssignmentType.SUBJECT_TEACHER ? section?.subjects.find((candidate) => candidate.active && candidate.subject.active && sameKey(candidate.subject.code, row.fields.subjectCode)) : undefined;
  if (!year || !schoolClass || !section || (type === TeacherAssignmentType.SUBJECT_TEACHER && !sectionSubject) || (type === TeacherAssignmentType.CLASS_TEACHER && row.fields.subjectCode)) throw new Error("Hierarchy changed after preview; assignment revalidation failed.");
  return { row, year, schoolClass, section, subject: sectionSubject?.subject ?? null, type };
}

async function loadValidationContext(schoolId: string, emails: string[]): Promise<TeacherBulkValidationContext> {
  const [years, users, assignments] = await Promise.all([
    prisma.academicYear.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        active: true,
        current: true,
        classes: {
          select: {
            id: true,
            academicYearId: true,
            code: true,
            name: true,
            active: true,
            sections: {
              select: {
                id: true,
                schoolClassId: true,
                code: true,
                name: true,
                active: true,
                subjects: { select: { id: true, subjectId: true, active: true, subject: { select: { id: true, code: true, name: true, active: true } } } },
              },
            },
          },
        },
      },
    }),
    emails.length ? prisma.user.findMany({ where: { email: { in: emails, mode: "insensitive" } }, select: { email: true, teacher: { select: { id: true, userId: true, schoolId: true, active: true, status: true, schoolMemberships: { where: { active: true, status: "ACTIVE" }, select: { schoolId: true } } } } } }) : Promise.resolve([]),
    prisma.teacherAssignment.findMany({ where: { schoolId, active: true }, select: { teacherId: true, academicYearId: true, schoolClassId: true, sectionId: true, subjectId: true, type: true } }),
  ]);
  return { years, teachers: users.flatMap((user) => user.teacher && user.teacher.schoolId === schoolId ? [{ id: user.teacher.id, userId: user.teacher.userId, email: user.email ?? "", active: user.teacher.active, status: user.teacher.status, eligible: user.teacher.active && user.teacher.status === "APPROVED" && user.teacher.schoolMemberships.some((membership) => membership.schoolId === schoolId) }] : []), users: users.map((user) => ({ email: user.email ?? "", teacherId: user.teacher?.id ?? null, teacherSchoolId: user.teacher?.schoolId ?? null })), assignments };
}

async function withSerializable<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) { if (isSerializationConflict(error) && attempt < 2) continue; throw error; }
  }
  throw new Error("Transaction could not be completed.");
}

function isSerializationConflict(error: unknown) { return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2034"); }
function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
function sameKey(left: string, right: string) { return left.trim().toLowerCase().replace(/\s+/g, " ") === right.trim().toLowerCase().replace(/\s+/g, " "); }
function assignmentKey(teacherId: string, yearId: string, classId: string, sectionId: string, subjectId: string | null, type: TeacherAssignmentType | string) { return [teacherId, yearId, classId, sectionId, subjectId ?? "", type].join("|"); }
function safeImportError(error: unknown) { const message = error instanceof Error ? error.message : "Import failed."; return /email is already in use|School access|Teacher is no longer|different Teacher|revalidation/i.test(message) ? message : "Import failed safely; no partial row was written."; }
