import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { decidePremiumFeatureEntitlement } from "../lib/entitlements/features-policy";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Student AI uses the existing publisher and premium feature vocabulary", async () => {
  const features = await read("lib/entitlements/features.ts");

  assert.match(
    features,
    /STUDENT_AI: PlatformFeatureKey\.STUDENT_AI/,
  );

  assert.deepEqual(
    decidePremiumFeatureEntitlement({
      plan: "SCHOOL_BASIC",
      feature: "STUDENT_AI",
      publisherFeatureEnabled: true,
    }),
    {
      allowed: false,
      reason: "PREMIUM_REQUIRED",
    },
  );

  for (const plan of [
    "SCHOOL_PREMIUM",
    "INDIVIDUAL_PREMIUM",
    "INDIVIDUAL_PREMIUM_MENTOR",
  ] as const) {
    assert.equal(
      decidePremiumFeatureEntitlement({
        plan,
        feature: "STUDENT_AI",
        publisherFeatureEnabled: true,
      }).allowed,
      true,
    );
  }

  assert.equal(
    decidePremiumFeatureEntitlement({
      plan: "SCHOOL_PREMIUM",
      feature: "STUDENT_AI",
      publisherFeatureEnabled: false,
    }).allowed,
    false,
  );
});

test("every request reuses student identity, book entitlement, premium, and exact immutable Smart Book grounding", async () => {
  const service = await read("lib/student-ai.ts");
  const adapter = await read(
    "lib/ai/student-smart-book-retrieval.ts",
  );

  assert.match(
    service,
    /await requireStudent\(\)/,
  );

  assert.match(
    service,
    /await getStudentBook\(bookId\)/,
  );

  assert.match(
    service,
    /feature: "STUDENT_AI"/,
  );

  assert.match(
    service,
    /retrieveStudentSmartBookAiGrounding\(\{/,
  );

  assert.match(
    service,
    /sectionSubjectId: book\.sectionSubjectId/,
  );

  assert.match(
    service,
    /chapterId,/,
  );

  assert.match(
    adapter,
    /loadStudentChapterStructuredContent/,
  );

  assert.doesNotMatch(
    service,
    /collectStudentChapterKnowledge/,
  );
});

test("student grounding uses immutable release content instead of mutable chapter educational fields", async () => {
  const service = await read("lib/student-ai.ts");
  const adapter = await read(
    "lib/ai/student-smart-book-retrieval.ts",
  );

  assert.match(
    adapter,
    /extractSmartBookAiDocument/,
  );

  assert.match(
    adapter,
    /"STUDENT"/,
  );

  assert.match(
    adapter,
    /releaseVersionId: structured\.release\.releaseVersionId/,
  );

  assert.doesNotMatch(
    adapter,
    /prisma\./,
  );

  assert.doesNotMatch(
    adapter,
    /\.summary\b/,
  );

  assert.doesNotMatch(
    adapter,
    /\.reviewedText\b/,
  );

  assert.doesNotMatch(
    adapter,
    /\.keywords\b/,
  );

  assert.doesNotMatch(
    adapter,
    /\.questions\b/,
  );

  assert.doesNotMatch(
    adapter,
    /\.activities\b/,
  );

  assert.doesNotMatch(
    service,
    /collectStudentChapterKnowledge/,
  );
});

test("client cannot provide prompts, grounding, plan, quota, model, or provider", async () => {
  const route = await read(
    "app/api/student/assistant/route.ts",
  );

  const service = await read("lib/student-ai.ts");

  assert.match(
    route,
    /runStudentAiRequest\(body\)/,
  );

  assert.doesNotMatch(
    route,
    /provider|model|prompt|grounding|studentId|publisherId|schoolId|plan/,
  );

  assert.doesNotMatch(
    service,
    /inputRecord\.(provider|model|prompt|grounding|studentId|publisherId|schoolId|plan)/,
  );
});

test("deterministic refusal occurs before reservation and provider selection", async () => {
  const service = await read("lib/student-ai.ts");

  const refusal = service.indexOf(
    "getDeterministicStudentAiRefusal",
  );

  const reserve = service.indexOf(
    "reserveStudentAiQuota",
    refusal,
  );

  const provider = service.indexOf(
    "getAiProvider",
    refusal,
  );

  assert.ok(
    refusal >= 0 &&
      reserve > refusal &&
      provider > refusal,
  );

  assert.match(
    service.slice(refusal, reserve),
    /persistStudentAiRefusal/,
  );
});

test("student quota ledger is independent from Teacher AiUsage and plan limits are server-owned", async () => {
  const quota = await read(
    "lib/ai/student-quota.ts",
  );

  const policy = await read(
    "lib/ai/student-policy.ts",
  );

  assert.match(
    quota,
    /studentAiUsage/,
  );

  assert.doesNotMatch(
    quota,
    /teacherId|aiGeneration|tx\.aiUsage/,
  );

  assert.match(
    policy,
    /SCHOOL_PREMIUM: 10/,
  );

  assert.match(
    policy,
    /INDIVIDUAL_PREMIUM: 25/,
  );

  assert.match(
    policy,
    /INDIVIDUAL_PREMIUM_MENTOR: 40/,
  );
});

test("quota consume and message persistence share one transaction", async () => {
  const quota = await read(
    "lib/ai/student-quota.ts",
  );

  const finalize = quota.slice(
    quota.indexOf("persistStudentAiSuccess"),
    quota.indexOf("persistStudentAiRefusal"),
  );

  assert.match(
    finalize,
    /prisma\.\$transaction/,
  );

  assert.match(
    finalize,
    /studentAiMessage\.create/,
  );

  assert.match(
    finalize,
    /status: AiUsageStatus\.CONSUMED/,
  );

  assert.match(
    finalize,
    /consumedAt: now/,
  );
});

test("conversation and history are scoped to student, tenant, year, book, and chapter", async () => {
  const service = await read("lib/student-ai.ts");

  assert.match(
    service,
    /studentId: identity\.student\.id/,
  );

  assert.match(
    service,
    /publisherId: identity\.publisher\.id/,
  );

  assert.match(
    service,
    /schoolId: identity\.school\.id/,
  );

  assert.match(
    service,
    /academicYearId:\s*identity\.academicYear\.id/,
  );

  assert.match(
    service,
    /bookId,[\s\S]*chapterId/,
  );

  assert.match(
    service,
    /studentId_academicYearId_bookId_chapterId/,
  );
});

test("history view contains no prompt, provider, model, token, source, or URL fields", async () => {
  const service = await read("lib/student-ai.ts");

  const safe = service.slice(
    service.indexOf(
      "function toSafeHistoryMessage",
    ),
    service.indexOf(
      "function resultFromMessage",
    ),
  );

  assert.match(
    safe,
    /mode:[\s\S]*question:[\s\S]*answer:[\s\S]*createdAt:/,
  );

  assert.doesNotMatch(
    safe,
    /prompt|provider|model|token|source|url|publisherId|schoolId|chapterId/,
  );
});

test("guided UI has mode cards and only Doubt Solver renders free text", async () => {
  const ui = await read(
    "components/student/StudentLearningAssistant.tsx",
  );

  assert.match(
    ui,
    /initialData\.modes\.map/,
  );

  assert.match(
    ui,
    /selectedMode\.scope === "DOUBT"/,
  );

  assert.match(
    ui,
    /<textarea/,
  );

  assert.doesNotMatch(
    ui,
    /model selection|temperature|file upload|image upload/i,
  );
});

test("Revision Hub exposes locked, disabled, unavailable, and open states safely", async () => {
  const page = await read(
    "app/student-dashboard/books/[bookId]/chapters/[chapterId]/revision/page.tsx",
  );

  assert.match(
    page,
    /Learning Assistant is available with Premium/,
  );

  assert.match(
    page,
    /This feature is not available on your platform/,
  );

  assert.match(
    page,
    /This learning assistant is not available for this chapter/,
  );

  assert.match(
    page,
    /Open Learning Assistant/,
  );
});

test("migration is additive, indexed, restrictive, and enables no publisher automatically", async () => {
  const migration = await read(
    "prisma/migrations/20260713233000_student_learning_assistant_foundation/migration.sql",
  );

  assert.match(
    migration,
    /CREATE TABLE "StudentAiConversation"/,
  );

  assert.match(
    migration,
    /CREATE TABLE "StudentAiMessage"/,
  );

  assert.match(
    migration,
    /CREATE TABLE "StudentAiUsage"/,
  );

  assert.match(
    migration,
    /FOREIGN KEY/,
  );

  assert.match(
    migration,
    /ON DELETE RESTRICT/,
  );

  assert.match(
    migration,
    /StudentAiConversation_studentId_academicYearId_bookId_chapterId_key/,
  );

  assert.doesNotMatch(
    migration,
    /INSERT INTO "PublisherFeature"|UPDATE "PublisherFeature"/i,
  );

  assert.doesNotMatch(
    migration,
    /DROP|TRUNCATE|DELETE FROM/i,
  );
});

test("seed marks Student AI implemented without enabling it or creating fake history", async () => {
  const seed = await read("prisma/seed.ts");

  assert.match(
    seed,
    /implemented = new Set[\s\S]*PlatformFeatureKey\.STUDENT_AI/,
  );

  const enabled = seed.slice(
    seed.indexOf("enabledForBluegate"),
    seed.indexOf("for (const key"),
  );

  assert.doesNotMatch(
    enabled,
    /PlatformFeatureKey\.STUDENT_AI/,
  );

  assert.doesNotMatch(
    seed,
    /studentAiConversation|studentAiMessage|studentAiUsage/i,
  );
});

test("Student and Teacher AI remain operationally separate while reusing the shared provider contract", async () => {
  const student = await read("lib/student-ai.ts");
  const teacher = await read(
    "lib/ai/runtime/execute.ts",
  );

  /*
   * Student AI continues to use the shared provider registry and
   * AiProvider contract, but its quota/persistence runtime remains
   * Student-specific.
   */
  assert.match(
    student,
    /getAiProvider\(resolveProviderId\(\)\)/,
  );

  assert.match(
    student,
    /\bAiProvider\b/,
  );

  assert.match(
    student,
    /executeStudentAiProviderStep/,
  );

  assert.match(
    student,
    /reserveStudentAiQuota/,
  );

  assert.match(
    student,
    /persistStudentAiSuccess/,
  );

  /*
   * Teacher execution remains Teacher-owned and must not acquire
   * Student AI persistence/quota dependencies.
   */
  assert.match(
    teacher,
    /teacherId/,
  );

  assert.doesNotMatch(
    teacher,
    /StudentAi|studentAi/,
  );

  assert.doesNotMatch(
    teacher,
    /reserveStudentAiQuota|persistStudentAiSuccess/,
  );
});
