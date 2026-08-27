import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createContentDocument } from "../lib/content-document";
import { adoptLayoutV2, createV2Frame } from "../lib/content-layout-v2";
import {
  assertTeachingPlanScope,
  buildCollisionSafeSequencePlan,
  buildTeachingPageDeepLink,
  deriveTeachingPageTitle,
  getTeachingPageSourceHash,
  resolveTeachingPageTargetFromDocuments,
  TeachingPlanError,
  validateOrderedIds,
  type TeachingModuleDocument,
} from "../lib/teaching-plan-policy";

const service = readFileSync("lib/teaching-plan.ts", "utf8");
const actions = readFileSync("app/teacher-dashboard/classes/[sectionId]/plan/teaching-actions.ts", "utf8");

function context() {
  return {
    schoolId: "school-a",
    academicYearId: "year-a",
    sectionSubjectId: "subject-a",
    teacherId: "teacher-a",
    bookId: "book-a",
  };
}

function scope(overrides: Partial<Record<"schoolId" | "academicYearId" | "sectionSubjectId" | "teacherId" | "bookId", string>> = {}) {
  return {
    schoolId: overrides.schoolId ?? "school-a",
    academicYearId: overrides.academicYearId ?? "year-a",
    sectionSubjectId: overrides.sectionSubjectId ?? "subject-a",
    teacherId: overrides.teacherId ?? "teacher-a",
    bookId: overrides.bookId ?? "book-a",
  };
}

function v2Module(id = "module-a"): TeachingModuleDocument {
  const pageId = "page-a";
  const document = adoptLayoutV2(createContentDocument([]), {
    pageSize: { preset: "CUSTOM", width: 800, height: 1000, unit: "px" },
    pages: [{
      id: pageId,
      order: 0,
      width: 800,
      height: 1000,
      unit: "px",
      frames: [createV2Frame("TEXT", pageId, { id: "frame-a", payload: "Fractions", readable: true, readingOrder: 1 })],
    }],
  });
  return { id, title: "Fractions Module", displayOrder: 1, chapterId: "chapter-a", chapterTitle: "Numbers", document };
}

test("Teaching Plan runtime is server-only and reuses canonical authorization/entitlement helpers", () => {
  assert.match(service, /import ["']server-only["']/);
  assert.match(service, /requireTeacher\(\)/);
  assert.match(service, /requireTeacherSubject\(/);
  assert.match(service, /resolveTeacherBookEligibility\(/);
  assert.match(service, /schoolId/);
  assert.match(service, /academicYearId/);
  assert.match(service, /teacherId/);
  assert.doesNotMatch(service, /prisma\.studentWork(Item|Attempt)/);
  assert.match(service, /academicPlannerItem/);
  assert.match(service, /HOLIDAY/);
  assert.match(actions, /["']use server["']/);
  assert.doesNotMatch(actions, /from ["']@\/lib\/prisma["']/);
});

test("scope mismatch rejects wrong teacher, school, year, subject, and book", () => {
  for (const key of ["teacherId", "schoolId", "academicYearId", "sectionSubjectId", "bookId"] as const) {
    assert.throws(
      () => assertTeachingPlanScope(scope({ [key]: "wrong" }), context()),
      (error: unknown) => error instanceof TeachingPlanError && error.code === "UNAUTHORIZED",
    );
  }
});

test("ordered IDs require an exact, duplicate-free authorized set", () => {
  assert.deepEqual(validateOrderedIds(["a", "b", "c"], ["c", "a", "b"], "period"), ["c", "a", "b"]);
  assert.throws(() => validateOrderedIds(["a", "b"], ["a", "a"], "period"), (error: unknown) => error instanceof TeachingPlanError && error.code === "CONFLICT");
  assert.throws(() => validateOrderedIds(["a", "b"], ["a"], "period"), (error: unknown) => error instanceof TeachingPlanError && error.code === "CONFLICT");
});

test("collision-safe order plans stage every row before contiguous final sequences", () => {
  assert.deepEqual(buildCollisionSafeSequencePlan(["c", "a", "b"], 100), [
    { id: "c", temporarySequence: 101, finalSequence: 1 },
    { id: "a", temporarySequence: 102, finalSequence: 2 },
    { id: "b", temporarySequence: 103, finalSequence: 3 },
  ]);
  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /sequence: \{ increment:/);
});

test("page targets accept stable IDs, reject numeric/page presentation identity, and validate modules", () => {
  const moduleDocument = v2Module();
  assert.equal(resolveTeachingPageTargetFromDocuments({ pageId: "page-a", moduleId: "module-a" }, [moduleDocument]).page.id, "page-a");
  assert.throws(() => resolveTeachingPageTargetFromDocuments({ pageId: "missing", moduleId: "module-a" }, [moduleDocument]), (error: unknown) => error instanceof TeachingPlanError && error.code === "INVALID_PAGE");
  assert.throws(() => resolveTeachingPageTargetFromDocuments({ pageId: "page-a", moduleId: "other" }, [moduleDocument]), (error: unknown) => error instanceof TeachingPlanError && error.code === "INVALID_MODULE");
  assert.match(service, /pageId/);
  assert.doesNotMatch(service, /pageNumber as identity/);
});


test("page hashes ignore presentation reorder/mode changes but detect semantic changes", () => {
  const moduleDocument = v2Module();
  const page = moduleDocument.document!.pageLayout!.pages[0]!;
  const presentationChanged = { ...page, order: 99, visualMode: "EXACT_REPLICA" as const, frames: [{ ...page.frames[0]!, x: 700, y: 600 }] };
  const semanticChanged = { ...presentationChanged, frames: [{ ...presentationChanged.frames[0]!, payload: "Decimals" }] };
  assert.equal(getTeachingPageSourceHash(page), getTeachingPageSourceHash(presentationChanged));
  assert.notEqual(getTeachingPageSourceHash(page), getTeachingPageSourceHash(semanticChanged));
});

test("page titles prefer readable semantic text and fall back to current display number", () => {
  const moduleDocument = v2Module();
  const page = moduleDocument.document!.pageLayout!.pages[0]!;
  assert.equal(deriveTeachingPageTitle(page, moduleDocument.document!, 1), "Fractions");
  const empty = { ...page, frames: [] };
  assert.equal(deriveTeachingPageTitle(empty, moduleDocument.document!, 4), "Page 4");
});

test("deep links carry pageId/moduleId and never an array index", () => {
  const link = buildTeachingPageDeepLink({ bookId: "book-a", moduleId: "module-a", pageId: "page-a" });
  assert.match(link.query, /pageId=page-a/);
  assert.match(link.query, /moduleId=module-a/);
  assert.equal(link.anchor, "page-page-a");
  assert.doesNotMatch(JSON.stringify(link), /index|pageNumber/);
});

test("batch page validation and mutations are all-or-nothing and ordered", () => {
  assert.match(service, /const candidates = await resolvePageTargets\(context, input\.pages\)/);
  assert.match(service, /createMany\(/);
  assert.match(service, /pageSourceHash: candidate\.pageSourceHash/);
  assert.match(service, /existing\.length \+ index \+ 1/);
  assert.match(service, /updateMany\(/);
  assert.match(service, /normalizePageRefsInTransaction/);
});

test("page refs remain teacher-private and master content is never mutated", () => {
  assert.doesNotMatch(service, /prisma\.(contentDocument|bookModule|narration)\.(update|updateMany|delete|deleteMany)/);
  assert.match(service, /MISSING_PAGE/);
  assert.match(service, /SOURCE_CHANGED/);
  assert.match(service, /getTeachingPlanForSchool/);
  assert.match(service, /requireSchool\(\)/);
});
test("plan creation uses canonical composite scope and resolves unique races", () => {
  assert.match(service, /schoolId_academicYearId_sectionSubjectId_teacherId_bookId/);
  assert.match(service, /getOrCreateTeachingPlan/);
  assert.match(service, /error, "P2002"/);
  assert.match(service, /data: scopeKey\(context\)/);
});

test("period creation appends server-side and does not require page references", () => {
  assert.match(service, /findFirst\(\{ where: \{ planId \}/);
  assert.match(service, /sequence = \(last\?\.sequence \?\? 0\) \+ 1/);
  assert.match(service, /planId,\s+sequence,\s+title,\s+plannedDate,\s+status:\s+TeachingPeriodStatus\.PLANNED/);
  assert.match(service, /deleteTeachingPeriod/);
  assert.match(service, /normalizePeriodsInTransaction/);
});
