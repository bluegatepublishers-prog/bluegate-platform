import "server-only";

import { Prisma } from "@prisma/client";

import { isLayoutV2Document, type LayoutV2Page, type LayoutV2VisualMode } from "@/lib/content-layout-v2";
import { loadPublishedModuleStructuredContent } from "@/lib/content-delivery";
import type { ContentDocument } from "@/lib/content-document";
import { loadPublishedContentDocument } from "@/lib/content-release";
import {
  assertTeachingPlanScope as assertScope,
  buildTeachingPageDeepLink,
  deriveTeachingPageTitle,
  getTeachingPageSourceHash,
  resolveTeachingPageTargetFromDocuments,
  TeachingPlanError,
  type TeachingModuleDocument,
  type TeachingPageCandidate,
  type TeachingPageDeepLink,
  type TeachingPageMetadata,
  type TeachingPageTarget,
} from "@/lib/teaching-plan-policy";
import { prisma } from "@/lib/prisma";
import { requireBookEntitlement } from "@/lib/entitlements/book";
import { SafeEntitlementError } from "@/lib/entitlements/errors";
import { requireSchool } from "@/lib/school-dashboard";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { requireTeacherSubject } from "@/lib/teacher-experience";

export {
  TeachingPlanError,
  assertScope as assertTeachingPlanPolicyScope,
  buildTeachingPageDeepLink,
  deriveTeachingPageTitle,
  getTeachingPageSourceHash,
  resolveTeachingPageTargetFromDocuments,
};
export type { TeachingModuleDocument, TeachingPageCandidate, TeachingPageDeepLink, TeachingPageMetadata, TeachingPageTarget };

export const TEACHING_PLAN_LIMITS = { title: 180, identifier: 128, pageTargets: 200, periods: 500 } as const;

export type TeachingPlanContextInput = { sectionSubjectId: string; bookId: string; academicYearId?: string };
export type TeachingPlanBookOption = { id: string; title: string };
export type TeachingPlanPageAvailability = {
  state: "V2_AVAILABLE" | "V1_ONLY" | "NO_DIGITAL_CONTENT";
  pages: TeachingPageMetadata[];
};
export type TeachingPageResolutionState = "CURRENT" | "SOURCE_CHANGED" | "MISSING_PAGE";

export type TeachingPageRefReadModel = {
  refId: string;
  pageId: string;
  sequence: number;
  moduleId: string | null;
  moduleTitle: string | null;
  chapterId: string | null;
  state: TeachingPageResolutionState;
  currentPageOrder: number | null;
  displayPageNumber: number | null;
  title: string;
  visualMode?: LayoutV2VisualMode;
  sourceChanged: boolean;
  deepLink: TeachingPageDeepLink;
};

export type TeachingPeriodReadModel = {
  id: string;
  planId: string;
  sequence: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  pageRefs: TeachingPageRefReadModel[];
};

export type TeachingPlanReadModel = {
  id: string;
  schoolId: string;
  academicYearId: string;
  sectionSubjectId: string;
  teacherId: string;
  bookId: string;
  createdAt: Date;
  updatedAt: Date;
  periods: TeachingPeriodReadModel[];
};

type TeachingTeacher = Awaited<ReturnType<typeof requireTeacher>>;
type TeachingPlanContext = {
  teacher: TeachingTeacher;
  schoolId: string;
  publisherId: string;
  academicYear: { id: string; name: string; startDate: Date; endDate: Date; active: boolean; current: boolean };
  sectionSubject: {
    id: string;
    sectionId: string;
    subjectId: string;
    subject: { id: string; name: string };
    section: { id: string; name: string; schoolClass: { id: string; name: string; schoolId: string; academicYearId: string } };
  };
  assignment: { id: string; type: "CLASS_TEACHER" | "SUBJECT_TEACHER" };
  book: { id: string; title: string; publisherId: string };
};

type TeachingContentContext = Pick<TeachingPlanContext, "publisherId" | "book">;

const PLAN_SCOPE_SELECT = {
  id: true,
  schoolId: true,
  academicYearId: true,
  sectionSubjectId: true,
  teacherId: true,
  bookId: true,
} satisfies Prisma.TeachingPlanSelect;

type TeachingPlanWithPeriods = Prisma.TeachingPlanGetPayload<{
  include: { periods: { include: { pageRefs: true } } };
}>;

function invalidInput(message: string): never {
  throw new TeachingPlanError("INVALID_INPUT", message);
}

function cleanIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string") invalidInput("Invalid " + label + ".");
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > TEACHING_PLAN_LIMITS.identifier) invalidInput("Invalid " + label + ".");
  return cleaned;
}

function cleanTitle(value: unknown): string {
  if (typeof value !== "string") invalidInput("Enter a valid period title.");
  const title = value.trim();
  if (!title || title.length > TEACHING_PLAN_LIMITS.title || /[<>]/u.test(title) || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(title)) {
    invalidInput("Enter a plain text period title.");
  }
  return title;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPrismaCode(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function toSaveError(error: unknown): never {
  if (error instanceof TeachingPlanError) throw error;
  if (isPrismaCode(error, "P2034")) throw new TeachingPlanError("CONFLICT", "The teaching order changed concurrently. Retry the operation.");
  throw new TeachingPlanError("SAVE_FAILED", "The teaching plan could not be saved.");
}

async function serializableTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!isPrismaCode(error, "P2034") || attempt === 2) throw error;
    }
  }
  throw new TeachingPlanError("CONFLICT", "The operation could not be completed safely.");
}

function scopeKey(context: TeachingPlanContext) {
  return {
    schoolId: context.schoolId,
    academicYearId: context.academicYear.id,
    sectionSubjectId: context.sectionSubject.id,
    teacherId: context.teacher.id,
    bookId: context.book.id,
  };
}

export function assertTeachingPlanScope(
  plan: { schoolId: string; academicYearId: string; sectionSubjectId: string; teacherId: string; bookId: string },
  context: TeachingPlanContext,
) {
  return assertScope(plan, {
    schoolId: context.schoolId,
    academicYearId: context.academicYear.id,
    sectionSubjectId: context.sectionSubject.id,
    teacherId: context.teacher.id,
    bookId: context.book.id,
  });
}
export async function resolveTeachingPlanContext(input: TeachingPlanContextInput): Promise<TeachingPlanContext> {
  const sectionSubjectId = cleanIdentifier(input.sectionSubjectId, "SectionSubject");
  const bookId = cleanIdentifier(input.bookId, "Book");
  const academicYearId = input.academicYearId ? cleanIdentifier(input.academicYearId, "academic year") : undefined;
  const teacher = await requireTeacher();
  if (!teacher.schoolId || !teacher.school?.publisherId) throw new TeachingPlanError("UNAUTHORIZED", "Teacher school access is unavailable.");

  const academicYear = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId: teacher.schoolId, active: true, ...(academicYearId ? {} : { current: true }) },
    select: { id: true, name: true, startDate: true, endDate: true, active: true, current: true },
  });
  if (!academicYear) throw new TeachingPlanError("ACADEMIC_YEAR_INVALID", "The academic year is not valid for this school.");

  const sectionSubject = await prisma.sectionSubject.findFirst({
    where: {
      id: sectionSubjectId,
      active: true,
      subject: { active: true },
      section: { active: true, schoolClass: { active: true, schoolId: teacher.schoolId, academicYearId: academicYear.id } },
    },
    select: {
      id: true,
      sectionId: true,
      subjectId: true,
      subject: { select: { id: true, name: true } },
      section: { select: { id: true, name: true, schoolClass: { select: { id: true, name: true, schoolId: true, academicYearId: true } } } },
    },
  });
  if (!sectionSubject) throw new TeachingPlanError("SECTION_SUBJECT_INVALID", "The subject is not valid for this school and academic year.");

  const assignment = await prisma.teacherAssignment.findFirst({
    where: {
      teacherId: teacher.id,
      schoolId: teacher.schoolId,
      academicYearId: academicYear.id,
      schoolClassId: sectionSubject.section.schoolClass.id,
      sectionId: sectionSubject.sectionId,
      subjectId: sectionSubject.subjectId,
      type: "SUBJECT_TEACHER",
      active: true,
      schoolClass: { active: true, schoolId: teacher.schoolId, academicYearId: academicYear.id },
      section: { active: true, schoolClassId: sectionSubject.section.schoolClass.id },
    },
    select: { id: true, type: true },
  });
  if (!assignment) throw new TeachingPlanError("UNAUTHORIZED", "You are not assigned to this subject.");

  if (academicYear.current) {
    try {
      await requireTeacherSubject(sectionSubject.sectionId, sectionSubject.id);
    } catch {
      throw new TeachingPlanError("UNAUTHORIZED", "You are not assigned to this subject.");
    }
  }

  try {
    await requireBookEntitlement(
      { id: teacher.userId, role: "TEACHER" },
      { bookId, academicYearId: academicYear.id, sectionId: sectionSubject.sectionId, sectionSubjectId: sectionSubject.id },
    );
  } catch (error) {
    if (error instanceof SafeEntitlementError) throw new TeachingPlanError("BOOK_NOT_ENTITLED", "This book is not authorized for this teaching scope.");
    throw error;
  }

  const book = await prisma.book.findFirst({
    where: { id: bookId, publisherId: teacher.school.publisherId, published: true, archived: false },
    select: { id: true, title: true, publisherId: true },
  });
  if (!book?.publisherId) throw new TeachingPlanError("BOOK_NOT_ENTITLED", "This book is not authorized for this teaching scope.");

  return {
    teacher,
    schoolId: teacher.schoolId,
    publisherId: teacher.school.publisherId,
    academicYear,
    sectionSubject,
    assignment: { id: assignment.id, type: assignment.type },
    book: { id: book.id, title: book.title, publisherId: book.publisherId },
  };
}

export async function listTeachingPlanBookOptions(input: { sectionId: string; sectionSubjectId?: string | null }) {
  const sectionId = cleanIdentifier(input.sectionId, "section");
  const requestedSubjectId = input.sectionSubjectId ? cleanIdentifier(input.sectionSubjectId, "SectionSubject") : undefined;
  const { scope, subject } = await requireTeacherSubject(sectionId, requestedSubjectId);
  const candidates = await prisma.schoolBookAdoption.findMany({
    where: {
      schoolId: scope.schoolId,
      publisherId: scope.publisherId,
      academicYearId: scope.academicYear.id,
      sectionId: scope.section.id,
      sectionSubjectId: subject.id,
      status: "APPROVED",
      active: true,
      book: {
        publisherId: scope.publisherId,
        published: true,
        archived: false,
        schoolEntitlements: { some: { schoolId: scope.schoolId, publisherId: scope.publisherId, status: "ACTIVE" } },
      },
    },
    select: { book: { select: { id: true, title: true } } },
    orderBy: [{ book: { title: "asc" } }, { id: "asc" }],
  });
  const resolved = await Promise.all(candidates.map(async ({ book }) => {
    try {
      const context = await resolveTeachingPlanContext({
        sectionSubjectId: subject.id,
        bookId: book.id,
        academicYearId: scope.academicYear.id,
      });
      return { id: context.book.id, title: context.book.title } satisfies TeachingPlanBookOption;
    } catch (error) {
      if (error instanceof TeachingPlanError) return null;
      throw error;
    }
  }));
  return {
    sectionId: scope.section.id,
    sectionSubjectId: subject.id,
    className: scope.schoolClass.name,
    sectionName: scope.section.name,
    subjectName: subject.subject.name,
    academicYearName: scope.academicYear.name,
    books: resolved.filter((book): book is TeachingPlanBookOption => Boolean(book)),
  };
}

export async function getTeachingPlanPageAvailability(input: TeachingPlanContextInput): Promise<TeachingPlanPageAvailability> {
  const context = await resolveTeachingPlanContext(input);
  const modules = await loadModuleDocuments(context);
  const pages = modules.flatMap((module) => {
    const document = module.document;
    if (!document || !isLayoutV2Document(document) || !document.pageLayout) return [];
    return orderedPages(document).map((page) => pageMetadata(pageCandidate(module, document, page), context.book.id));
  });
  if (pages.length) return { state: "V2_AVAILABLE", pages };
  const hasV1Content = modules.some((module) => Boolean(module.document && !isLayoutV2Document(module.document) && module.document.blocks.length));
  return { state: hasV1Content ? "V1_ONLY" : "NO_DIGITAL_CONTENT", pages: [] };
}

export async function getTeachingPlanPageData(input: { sectionId: string; sectionSubjectId?: string | null; bookId?: string | null }) {
  const scope = await listTeachingPlanBookOptions({ sectionId: input.sectionId, sectionSubjectId: input.sectionSubjectId });
  const requestedBookId = input.bookId ? cleanIdentifier(input.bookId, "Book") : undefined;
  const selectedBook = scope.books.find((book) => book.id === requestedBookId) ?? scope.books[0] ?? null;
  if (!selectedBook) return { ...scope, selectedBook: null, plan: null, pageAvailability: { state: "NO_DIGITAL_CONTENT" as const, pages: [] } };
  const context = { sectionSubjectId: scope.sectionSubjectId, bookId: selectedBook.id } satisfies TeachingPlanContextInput;
  const [plans, pageAvailability] = await Promise.all([
    listTeachingPlans(context),
    getTeachingPlanPageAvailability(context),
  ]);
  return { ...scope, selectedBook, plan: plans[0] ?? null, pageAvailability };
}

export async function getTeachingPlanPagePreview(input: TeachingPlanContextInput & { pageId: string; moduleId: string }) {
  const context = await resolveTeachingPlanContext(input);
  const [target] = normalizePageTargets([{ pageId: input.pageId, moduleId: input.moduleId }]);
  if (!target) invalidInput("Invalid page selection.");
  const modules = await loadModuleDocuments(context, [target.moduleId ?? ""], true);
  const candidate = resolveTeachingPageTargetFromDocuments(target, modules);
  const rendered = await loadPublishedModuleStructuredContent({
    publisherId: context.publisherId,
    bookId: context.book.id,
    moduleId: candidate.module.id,
    mode: "TEACHER",
  });
  const page = rendered?.document.pageLayout?.pages.find((entry) => entry.id === candidate.page.id);
  if (!rendered || !page || !isLayoutV2Document(rendered.document)) {
    throw new TeachingPlanError("INVALID_PAGE", "The selected V2 page is no longer available.");
  }
  return {
    metadata: pageMetadata(candidate, context.book.id),
    document: { ...rendered.document, pageLayout: { ...rendered.document.pageLayout!, pages: [page] } },
    linkedAssets: rendered.linkedAssets,
    activities: rendered.activities,
    worksheets: rendered.worksheets,
    media: rendered.media,
    sectionDefinitions: rendered.sections,
    knowledgeDefinitions: rendered.knowledgeDefinitions,
    resourceUrls: rendered.v2ResourceUrls,
  };
}
async function authorizePlan(planId: string) {
  const id = cleanIdentifier(planId, "TeachingPlan");
  const plan = await prisma.teachingPlan.findUnique({ where: { id }, select: PLAN_SCOPE_SELECT });
  if (!plan) throw new TeachingPlanError("PLAN_NOT_FOUND", "Teaching plan not found.");
  const context = await resolveTeachingPlanContext({ sectionSubjectId: plan.sectionSubjectId, bookId: plan.bookId, academicYearId: plan.academicYearId });
  assertTeachingPlanScope(plan, context);
  return { plan, context };
}

async function authorizePeriod(periodId: string) {
  const id = cleanIdentifier(periodId, "TeachingPeriod");
  const period = await prisma.teachingPeriod.findUnique({ where: { id }, select: { id: true, planId: true } });
  if (!period) throw new TeachingPlanError("PERIOD_NOT_FOUND", "Teaching period not found.");
  const authorization = await authorizePlan(period.planId);
  return { period, ...authorization };
}

export async function getTeachingPlan(input: { planId: string }): Promise<TeachingPlanReadModel> {
  const planId = cleanIdentifier(input.planId, "TeachingPlan");
  const { context } = await authorizePlan(planId);
  const plan = await prisma.teachingPlan.findUnique({
    where: { id: planId },
    include: {
      periods: {
        orderBy: [{ sequence: "asc" }, { id: "asc" }],
        include: { pageRefs: { orderBy: [{ sequence: "asc" }, { id: "asc" }] } },
      },
    },
  });
  if (!plan) throw new TeachingPlanError("PLAN_NOT_FOUND", "Teaching plan not found.");
  return buildPlanReadModel(plan, context);
}

export async function getOrCreateTeachingPlan(input: TeachingPlanContextInput): Promise<TeachingPlanReadModel> {
  const context = await resolveTeachingPlanContext(input);
  const key = scopeKey(context);
  const existing = await prisma.teachingPlan.findUnique({
    where: { schoolId_academicYearId_sectionSubjectId_teacherId_bookId: key },
    select: { id: true },
  });
  if (existing) return getTeachingPlan({ planId: existing.id });

  try {
    const created = await prisma.teachingPlan.create({ data: key, select: { id: true } });
    return getTeachingPlan({ planId: created.id });
  } catch (error) {
    if (!isPrismaCode(error, "P2002")) toSaveError(error);
    const raced = await prisma.teachingPlan.findUnique({
      where: { schoolId_academicYearId_sectionSubjectId_teacherId_bookId: key },
      select: { id: true },
    });
    if (!raced) throw new TeachingPlanError("SAVE_FAILED", "The teaching plan could not be created.");
    return getTeachingPlan({ planId: raced.id });
  }
}

export async function createTeachingPlan(input: TeachingPlanContextInput): Promise<TeachingPlanReadModel> {
  const context = await resolveTeachingPlanContext(input);
  try {
    const created = await prisma.teachingPlan.create({ data: scopeKey(context), select: { id: true } });
    return getTeachingPlan({ planId: created.id });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) throw new TeachingPlanError("CONFLICT", "A teaching plan already exists for this scope.");
    toSaveError(error);
  }
}

export async function listTeachingPlans(input: { academicYearId?: string; sectionSubjectId?: string; bookId?: string } = {}) {
  const teacher = await requireTeacher();
  if (!teacher.schoolId) throw new TeachingPlanError("UNAUTHORIZED", "Teacher school access is unavailable.");
  const academicYearId = input.academicYearId ? cleanIdentifier(input.academicYearId, "academic year") : undefined;
  const year = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId: teacher.schoolId, active: true, ...(academicYearId ? {} : { current: true }) },
    select: { id: true },
  });
  if (!year) throw new TeachingPlanError("ACADEMIC_YEAR_INVALID", "The academic year is not valid for this school.");
  const sectionSubjectId = input.sectionSubjectId ? cleanIdentifier(input.sectionSubjectId, "SectionSubject") : undefined;
  const bookId = input.bookId ? cleanIdentifier(input.bookId, "Book") : undefined;
  const rows = await prisma.teachingPlan.findMany({
    where: { schoolId: teacher.schoolId, teacherId: teacher.id, academicYearId: year.id, sectionSubjectId, bookId },
    select: PLAN_SCOPE_SELECT,
    orderBy: [{ sectionSubjectId: "asc" }, { bookId: "asc" }, { id: "asc" }],
  });
  return Promise.all(rows.map((row) => getTeachingPlan({ planId: row.id })));
}

async function normalizePeriodsInTransaction(tx: Prisma.TransactionClient, planId: string) {
  const rows = await tx.teachingPeriod.findMany({ where: { planId }, orderBy: [{ sequence: "asc" }, { id: "asc" }], select: { id: true, sequence: true } });
  if (!rows.length) return rows;
  const maximum = Math.max(...rows.map((row) => row.sequence));
  if (maximum > 1_000_000_000) throw new TeachingPlanError("CONFLICT", "The existing period order cannot be safely normalized.");
  await tx.teachingPeriod.updateMany({ where: { planId }, data: { sequence: { increment: Math.max(1_000_000, maximum + 1) } } });
  for (const [index, row] of rows.entries()) await tx.teachingPeriod.update({ where: { id: row.id }, data: { sequence: index + 1 } });
  return tx.teachingPeriod.findMany({ where: { planId }, orderBy: [{ sequence: "asc" }, { id: "asc" }] });
}

async function normalizePageRefsInTransaction(tx: Prisma.TransactionClient, periodId: string) {
  const rows = await tx.teachingPeriodPageRef.findMany({ where: { periodId }, orderBy: [{ sequence: "asc" }, { id: "asc" }], select: { id: true, sequence: true } });
  if (!rows.length) return rows;
  const maximum = Math.max(...rows.map((row) => row.sequence));
  if (maximum > 1_000_000_000) throw new TeachingPlanError("CONFLICT", "The existing page order cannot be safely normalized.");
  await tx.teachingPeriodPageRef.updateMany({ where: { periodId }, data: { sequence: { increment: Math.max(1_000_000, maximum + 1) } } });
  for (const [index, row] of rows.entries()) await tx.teachingPeriodPageRef.update({ where: { id: row.id }, data: { sequence: index + 1 } });
  return tx.teachingPeriodPageRef.findMany({ where: { periodId }, orderBy: [{ sequence: "asc" }, { id: "asc" }] });
}

export function validateOrderedIds(existingIds: string[], orderedIds: unknown, label: string): string[] {
  if (!Array.isArray(orderedIds) || orderedIds.length !== existingIds.length) throw new TeachingPlanError("CONFLICT", "The " + label + " order is stale.");
  const existing = new Set(existingIds);
  const requested = orderedIds.map((value) => cleanIdentifier(value, label + " id"));
  const unique = new Set(requested);
  if (unique.size !== requested.length || requested.some((id) => !existing.has(id))) throw new TeachingPlanError("CONFLICT", "The " + label + " order is stale.");
  return requested;
}

export function buildCollisionSafeSequencePlan(ids: string[], temporaryOffset = 1_000_000) {
  return ids.map((id, index) => ({ id, temporarySequence: temporaryOffset + index + 1, finalSequence: index + 1 }));
}

export async function createTeachingPeriod(input: { planId: string; title: string }) {
  const planId = cleanIdentifier(input.planId, "TeachingPlan");
  await authorizePlan(planId);
  const title = cleanTitle(input.title);
  try {
    const created = await serializableTransaction(async (tx) => {
      const last = await tx.teachingPeriod.findFirst({ where: { planId }, orderBy: [{ sequence: "desc" }, { id: "desc" }], select: { sequence: true } });
      const sequence = (last?.sequence ?? 0) + 1;
      if (sequence > TEACHING_PLAN_LIMITS.periods) throw new TeachingPlanError("CONFLICT", "A teaching plan cannot contain more periods.");
      return tx.teachingPeriod.create({ data: { planId, sequence, title }, select: { id: true } });
    });
    return getTeachingPeriod({ periodId: created.id });
  } catch (error) {
    if (error instanceof TeachingPlanError) throw error;
    toSaveError(error);
  }
}

export async function updateTeachingPeriod(input: { periodId: string; title: string }) {
  const periodId = cleanIdentifier(input.periodId, "TeachingPeriod");
  await authorizePeriod(periodId);
  const title = cleanTitle(input.title);
  try {
    await prisma.teachingPeriod.update({ where: { id: periodId }, data: { title } });
    return getTeachingPeriod({ periodId });
  } catch (error) {
    toSaveError(error);
  }
}

export async function deleteTeachingPeriod(input: { periodId: string }) {
  const periodId = cleanIdentifier(input.periodId, "TeachingPeriod");
  const { period, plan } = await authorizePeriod(periodId);
  try {
    await serializableTransaction(async (tx) => {
      await tx.teachingPeriod.delete({ where: { id: period.id } });
      await normalizePeriodsInTransaction(tx, plan.id);
    });
  } catch (error) {
    toSaveError(error);
  }
  return { deletedPeriodId: period.id };
}

export async function reorderTeachingPeriods(input: { planId: string; orderedPeriodIds: unknown }) {
  const planId = cleanIdentifier(input.planId, "TeachingPlan");
  await authorizePlan(planId);
  try {
    await serializableTransaction(async (tx) => {
      const rows = await tx.teachingPeriod.findMany({ where: { planId }, orderBy: [{ sequence: "asc" }, { id: "asc" }], select: { id: true } });
      const orderedIds = validateOrderedIds(rows.map((row) => row.id), input.orderedPeriodIds, "period");
      if (!rows.length) return;
      await tx.teachingPeriod.updateMany({ where: { planId }, data: { sequence: { increment: Math.max(1_000_000, rows.length + 1) } } });
      for (const [index, id] of orderedIds.entries()) await tx.teachingPeriod.update({ where: { id }, data: { sequence: index + 1 } });
    });
  } catch (error) {
    toSaveError(error);
  }
  return getTeachingPlan({ planId });
}

export async function moveTeachingPeriod(input: { periodId: string; direction: "EARLIER" | "LATER" }) {
  const periodId = cleanIdentifier(input.periodId, "TeachingPeriod");
  const { period, plan } = await authorizePeriod(periodId);
  if (input.direction !== "EARLIER" && input.direction !== "LATER") invalidInput("Invalid period move direction.");
  const periods = await prisma.teachingPeriod.findMany({ where: { planId: plan.id }, orderBy: [{ sequence: "asc" }, { id: "asc" }], select: { id: true } });
  const index = periods.findIndex((entry) => entry.id === period.id);
  if (index < 0) throw new TeachingPlanError("PERIOD_NOT_FOUND", "Teaching period not found.");
  const nextIndex = input.direction === "EARLIER" ? Math.max(0, index - 1) : Math.min(periods.length - 1, index + 1);
  const ordered = periods.map((entry) => entry.id);
  const moved = ordered.splice(index, 1)[0];
  ordered.splice(nextIndex, 0, moved);
  return reorderTeachingPeriods({ planId: plan.id, orderedPeriodIds: ordered });
}

export async function getTeachingPeriod(input: { periodId: string }) {
  const periodId = cleanIdentifier(input.periodId, "TeachingPeriod");
  const { period, context } = await authorizePeriod(periodId);
  const result = await prisma.teachingPeriod.findUnique({
    where: { id: period.id },
    include: { pageRefs: { orderBy: [{ sequence: "asc" }, { id: "asc" }] } },
  });
  if (!result) throw new TeachingPlanError("PERIOD_NOT_FOUND", "Teaching period not found.");
  return {
    id: result.id,
    planId: result.planId,
    sequence: result.sequence,
    title: result.title,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    pageRefs: await resolvePersistedPageRefs(result.pageRefs, context),
  };
}

function orderedPages(document: ContentDocument) {
  return (document.pageLayout?.pages ?? []).slice().sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function pageCandidate(module: TeachingModuleDocument, document: ContentDocument, page: LayoutV2Page): TeachingPageCandidate {
  const pages = orderedPages(document);
  const currentPageOrder = pages.findIndex((entry) => entry.id === page.id);
  return {
    module,
    document,
    page,
    currentPageOrder,
    displayPageNumber: currentPageOrder + 1,
    pageSourceHash: getTeachingPageSourceHash(page),
  };
}

function pageMetadata(candidate: TeachingPageCandidate, bookId: string): TeachingPageMetadata {
  return {
    moduleId: candidate.module.id,
    moduleTitle: candidate.module.title,
    chapterId: candidate.module.chapterId,
    chapterTitle: candidate.module.chapterTitle,
    pageId: candidate.page.id,
    currentPageOrder: candidate.currentPageOrder,
    displayPageNumber: candidate.displayPageNumber,
    title: deriveTeachingPageTitle(candidate.page, candidate.document, candidate.displayPageNumber),
    ...(candidate.page.visualMode ? { visualMode: candidate.page.visualMode } : {}),
    deepLink: buildTeachingPageDeepLink({ bookId, moduleId: candidate.module.id, pageId: candidate.page.id }),
  };
}
async function loadModuleDocuments(context: TeachingContentContext, moduleIds?: string[], strictModules = true): Promise<TeachingModuleDocument[]> {
  const rows = await prisma.bookModule.findMany({
    where: { bookId: context.book.id, published: true, archived: false, ...(moduleIds ? { id: { in: moduleIds } } : {}) },
    select: { id: true, title: true, displayOrder: true, chapterId: true, chapter: { select: { title: true } } },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
  if (strictModules && moduleIds && rows.length !== new Set(moduleIds).size) throw new TeachingPlanError("INVALID_MODULE", "The selected module is not part of this book.");
  return Promise.all(rows.map(async (row) => ({
    id: row.id,
    title: row.title,
    displayOrder: row.displayOrder,
    chapterId: row.chapterId,
    chapterTitle: row.chapter?.title ?? null,
    document: await loadPublishedContentDocument({ publisherId: context.publisherId, bookId: context.book.id, targetType: "MODULE", targetId: row.id }),
  })));
}

function normalizePageTargets(value: unknown): TeachingPageTarget[] {
  if (!Array.isArray(value) || value.length > TEACHING_PLAN_LIMITS.pageTargets) invalidInput("Select a valid number of pages.");
  return value.map((entry) => {
    if (!isRecord(entry)) invalidInput("Invalid page selection.");
    const allowedKeys = new Set(["pageId", "moduleId"]);
    if (Object.keys(entry).some((key) => !allowedKeys.has(key))) invalidInput("Page identity must use pageId and optional moduleId.");
    const pageId = cleanIdentifier(entry.pageId, "page");
    const moduleId = entry.moduleId === undefined || entry.moduleId === null ? undefined : cleanIdentifier(entry.moduleId, "BookModule");
    return moduleId ? { pageId, moduleId } : { pageId };
  });
}

function targetModuleIds(targets: TeachingPageTarget[]) {
  const ids = [...new Set(targets.map((target) => target.moduleId).filter((id): id is string => Boolean(id)))];
  return targets.some((target) => !target.moduleId) ? undefined : ids;
}

export function resolveTeachingPageTargetsFromDocuments(targets: unknown, modules: TeachingModuleDocument[]): TeachingPageCandidate[] {
  return normalizePageTargets(targets).map((target) => resolveTeachingPageTargetFromDocuments(target, modules));
}

async function resolvePageTargets(context: TeachingContentContext, targets: unknown) {
  const normalized = normalizePageTargets(targets);
  const modules = await loadModuleDocuments(context, targetModuleIds(normalized), true);
  return normalized.map((target) => resolveTeachingPageTargetFromDocuments(target, modules));
}

async function resolvePersistedPageRefs(
  refs: Array<{ id: string; periodId: string; pageId: string; moduleId: string | null; pageSourceHash: string | null; sequence: number }>,
  context: TeachingContentContext,
): Promise<TeachingPageRefReadModel[]> {
  const moduleIds = [...new Set(refs.map((ref) => ref.moduleId).filter((id): id is string => Boolean(id)))];
  const modules = await loadModuleDocuments(context, refs.some((ref) => !ref.moduleId) ? undefined : moduleIds, false);
  return refs.map((ref) => {
    const moduleRecord = ref.moduleId ? modules.find((entry) => entry.id === ref.moduleId) : undefined;
    try {
      const candidate = resolveTeachingPageTargetFromDocuments({ pageId: ref.pageId, ...(ref.moduleId ? { moduleId: ref.moduleId } : {}) }, modules);
      const metadata = pageMetadata(candidate, context.book.id);
      const sourceChanged = Boolean(ref.pageSourceHash && ref.pageSourceHash !== candidate.pageSourceHash);
      return {
        refId: ref.id,
        pageId: ref.pageId,
        sequence: ref.sequence,
        moduleId: ref.moduleId,
        moduleTitle: metadata.moduleTitle,
        chapterId: metadata.chapterId,
        state: sourceChanged ? "SOURCE_CHANGED" : "CURRENT",
        currentPageOrder: metadata.currentPageOrder,
        displayPageNumber: metadata.displayPageNumber,
        title: metadata.title,
        ...(metadata.visualMode ? { visualMode: metadata.visualMode } : {}),
        sourceChanged,
        deepLink: metadata.deepLink,
      };
    } catch (error) {
      if (error instanceof TeachingPlanError && ["INVALID_PAGE", "INVALID_MODULE", "V1_UNSUPPORTED"].includes(error.code)) {
        return {
          refId: ref.id,
          pageId: ref.pageId,
          sequence: ref.sequence,
          moduleId: ref.moduleId,
          moduleTitle: moduleRecord?.title ?? null,
          chapterId: moduleRecord?.chapterId ?? null,
          state: "MISSING_PAGE" as const,
          currentPageOrder: null,
          displayPageNumber: null,
          title: "Missing page",
          sourceChanged: false,
          deepLink: buildTeachingPageDeepLink({ bookId: context.book.id, moduleId: ref.moduleId ?? "missing-module", pageId: ref.pageId }),
        };
      }
      throw error;
    }
  });
}

async function buildPlanReadModel(plan: TeachingPlanWithPeriods, context: TeachingContentContext): Promise<TeachingPlanReadModel> {
  return {
    id: plan.id,
    schoolId: plan.schoolId,
    academicYearId: plan.academicYearId,
    sectionSubjectId: plan.sectionSubjectId,
    teacherId: plan.teacherId,
    bookId: plan.bookId,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    periods: await Promise.all(plan.periods.map(async (period) => ({
      id: period.id,
      planId: period.planId,
      sequence: period.sequence,
      title: period.title,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
      pageRefs: await resolvePersistedPageRefs(period.pageRefs, context),
    }))),
  };
}

export async function listAvailableV2Pages(input: TeachingPlanContextInput): Promise<TeachingPageMetadata[]> {
  return (await getTeachingPlanPageAvailability(input)).pages;
}

export async function addTeachingPeriodPages(input: { periodId: string; pages: unknown }) {
  const periodId = cleanIdentifier(input.periodId, "TeachingPeriod");
  const { period, context } = await authorizePeriod(periodId);
  const candidates = await resolvePageTargets(context, input.pages);
  const uniqueCandidates = candidates.filter((candidate, index, all) => all.findIndex((entry) => entry.page.id === candidate.page.id) === index);
  try {
    await serializableTransaction(async (tx) => {
      const existing = await tx.teachingPeriodPageRef.findMany({ where: { periodId: period.id }, orderBy: [{ sequence: "asc" }, { id: "asc" }], select: { pageId: true } });
      const existingPageIds = new Set(existing.map((row) => row.pageId));
      const toCreate = uniqueCandidates.filter((candidate) => !existingPageIds.has(candidate.page.id));
      if (!toCreate.length) return;
      if (existing.length + toCreate.length > TEACHING_PLAN_LIMITS.pageTargets) throw new TeachingPlanError("CONFLICT", "A teaching period cannot contain more selected pages.");
      await tx.teachingPeriodPageRef.createMany({
        data: toCreate.map((candidate, index) => ({
          periodId: period.id,
          pageId: candidate.page.id,
          moduleId: candidate.module.id,
          pageSourceHash: candidate.pageSourceHash,
          sequence: existing.length + index + 1,
        })),
      });
    });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return getTeachingPeriod({ periodId: period.id });
    toSaveError(error);
  }
  return getTeachingPeriod({ periodId: period.id });
}

export async function removeTeachingPeriodPage(input: { periodId: string; pageRefId: string }) {
  const periodId = cleanIdentifier(input.periodId, "TeachingPeriod");
  const pageRefId = cleanIdentifier(input.pageRefId, "TeachingPeriodPageRef");
  const { period } = await authorizePeriod(periodId);
  try {
    await serializableTransaction(async (tx) => {
      const deleted = await tx.teachingPeriodPageRef.deleteMany({ where: { id: pageRefId, periodId: period.id } });
      if (deleted.count !== 1) throw new TeachingPlanError("PAGE_REF_NOT_FOUND", "The teaching page reference was not found.");
      await normalizePageRefsInTransaction(tx, period.id);
    });
  } catch (error) {
    toSaveError(error);
  }
  return getTeachingPeriod({ periodId: period.id });
}

export async function reorderTeachingPeriodPages(input: { periodId: string; orderedPageRefIds: unknown }) {
  const periodId = cleanIdentifier(input.periodId, "TeachingPeriod");
  const { period } = await authorizePeriod(periodId);
  try {
    await serializableTransaction(async (tx) => {
      const rows = await tx.teachingPeriodPageRef.findMany({ where: { periodId: period.id }, orderBy: [{ sequence: "asc" }, { id: "asc" }], select: { id: true } });
      const orderedIds = validateOrderedIds(rows.map((row) => row.id), input.orderedPageRefIds, "page");
      if (!rows.length) return;
      await tx.teachingPeriodPageRef.updateMany({ where: { periodId: period.id }, data: { sequence: { increment: Math.max(1_000_000, rows.length + 1) } } });
      for (const [index, id] of orderedIds.entries()) await tx.teachingPeriodPageRef.update({ where: { id }, data: { sequence: index + 1 } });
    });
  } catch (error) {
    toSaveError(error);
  }
  return getTeachingPeriod({ periodId: period.id });
}

export async function getTeachingPlanForSchool(planId: string) {
  const school = await requireSchool();
  const id = cleanIdentifier(planId, "TeachingPlan");
  const full = await prisma.teachingPlan.findFirst({
    where: {
      id,
      schoolId: school.id,
      book: {
        publisherId: school.publisherId ?? "",
        published: true,
        archived: false,
        schoolEntitlements: { some: { schoolId: school.id, publisherId: school.publisherId ?? "", status: "ACTIVE" } },
      },
    },
    include: {
      book: { select: { id: true, title: true, publisherId: true } },
      periods: {
        orderBy: [{ sequence: "asc" }, { id: "asc" }],
        include: { pageRefs: { orderBy: [{ sequence: "asc" }, { id: "asc" }] } },
      },
    },
  });
  if (!full) throw new TeachingPlanError("PLAN_NOT_FOUND", "Teaching plan is not available.");
  const publisherId = full.book?.publisherId;
  if (!publisherId) throw new TeachingPlanError("PLAN_NOT_FOUND", "Teaching plan is not available.");
  return buildPlanReadModel(full, {
    publisherId,
    book: { id: full.book.id, title: full.book.title, publisherId },
  });
}
export async function getSchoolTeachingPlanPagePreview(input: {
  planId: string;
  periodId: string;
  pageRefId: string;
}) {
  const school = await requireSchool();
  const planId = cleanIdentifier(input.planId, "TeachingPlan");
  const periodId = cleanIdentifier(input.periodId, "TeachingPeriod");
  const pageRefId = cleanIdentifier(input.pageRefId, "TeachingPeriodPageRef");
  const plan = await prisma.teachingPlan.findFirst({
    where: {
      id: planId,
      schoolId: school.id,
      book: {
        publisherId: school.publisherId ?? "",
        published: true,
        archived: false,
        schoolEntitlements: {
          some: { schoolId: school.id, publisherId: school.publisherId ?? "", status: "ACTIVE" },
        },
      },
    },
    select: {
      academicYearId: true,
      book: { select: { id: true, title: true, publisherId: true } },
      periods: {
        where: { id: periodId },
        select: { id: true, pageRefs: { where: { id: pageRefId }, select: { id: true, pageId: true, moduleId: true } } },
      },
    },
  });
  const ref = plan?.periods[0]?.pageRefs[0];
  if (!plan?.book?.publisherId || !ref) {
    throw new TeachingPlanError("INVALID_PAGE", "The selected V2 page is no longer available.");
  }
  const context = {
    publisherId: plan.book.publisherId,
    book: { id: plan.book.id, title: plan.book.title, publisherId: plan.book.publisherId },
  } satisfies TeachingContentContext;
  const modules = await loadModuleDocuments(context, ref.moduleId ? [ref.moduleId] : undefined, true);
  const candidate = resolveTeachingPageTargetFromDocuments(
    { pageId: ref.pageId, ...(ref.moduleId ? { moduleId: ref.moduleId } : {}) },
    modules,
  );
  const rendered = await loadPublishedModuleStructuredContent({
    publisherId: context.publisherId,
    bookId: context.book.id,
    moduleId: candidate.module.id,
    mode: "STUDENT",
  });
  const page = rendered?.document.pageLayout?.pages.find((entry) => entry.id === candidate.page.id);
  if (!rendered || !page || !isLayoutV2Document(rendered.document)) {
    throw new TeachingPlanError("INVALID_PAGE", "The selected V2 page is no longer available.");
  }
  return {
    metadata: pageMetadata(candidate, context.book.id),
    document: { ...rendered.document, pageLayout: { ...rendered.document.pageLayout!, pages: [page] } },
    linkedAssets: rendered.linkedAssets,
    activities: rendered.activities,
    worksheets: rendered.worksheets,
    media: rendered.media,
    sectionDefinitions: rendered.sections,
    knowledgeDefinitions: rendered.knowledgeDefinitions,
    resourceUrls: Object.fromEntries(
      Object.keys(rendered.v2ResourceUrls).map((resourceId) => [
        resourceId,
        `/api/school/resources/${encodeURIComponent(resourceId)}/open`,
      ]),
    ),
  };
}
