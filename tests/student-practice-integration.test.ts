import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { decidePremiumFeatureEntitlement } from "../lib/entitlements/features-policy";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Practice uses the matching interactive-quizzes publisher and premium vocabulary", async () => {
  const featureResolver = await read("lib/entitlements/features.ts");
  assert.match(featureResolver, /INTERACTIVE_QUIZZES: PlatformFeatureKey\.INTERACTIVE_QUIZZES/);
  assert.deepEqual(decidePremiumFeatureEntitlement({ plan: "SCHOOL_BASIC", feature: "INTERACTIVE_QUIZZES", publisherFeatureEnabled: true }), { allowed: false, reason: "PREMIUM_REQUIRED" });
  for (const plan of ["SCHOOL_PREMIUM", "INDIVIDUAL_PREMIUM", "INDIVIDUAL_PREMIUM_MENTOR"] as const) assert.equal(decidePremiumFeatureEntitlement({ plan, feature: "INTERACTIVE_QUIZZES", publisherFeatureEnabled: true }).allowed, true);
  assert.equal(decidePremiumFeatureEntitlement({ plan: "SCHOOL_PREMIUM", feature: "INTERACTIVE_QUIZZES", publisherFeatureEnabled: false }).allowed, false);
});

test("every attempt flow starts from student identity, book entitlement, premium, and exact chapter scope", async () => {
  const source = await read("lib/student-practice.ts");
  assert.match(source, /await requireStudent\(\)/);
  assert.match(source, /await getStudentBook\(bookId\)/);
  assert.match(source, /feature: "INTERACTIVE_QUIZZES"/);
  assert.match(source, /where: \{ id: chapterId, bookId, approved: true \}/);
});

test("question selection is server-owned, approved, supported, deterministic, and capped", async () => {
  const source = await read("lib/student-practice.ts");
  assert.match(source, /approved: true, questionType: \{ in: \["MCQ", "TRUE_FALSE", "FILL_BLANK"\] \}/);
  assert.match(source, /orderBy: \[\{ createdAt: "asc" \}, \{ id: "asc" \}\]/);
  assert.match(source, /take: 20/);
  assert.doesNotMatch(source.slice(source.indexOf("startStudentPractice"), source.indexOf("loadOwnedAttempt")), /input\.questionIds/);
});

test("attempt creation resumes active rows and transactionally creates response membership", async () => {
  const source = await read("lib/student-practice.ts");
  assert.match(source, /status: PracticeAttemptStatus\.IN_PROGRESS/);
  assert.match(source, /if \(existing\) return \{ attemptId: existing\.id, resumed: true \}/);
  assert.match(source, /responses: \{ create: questions\.map/);
  assert.match(source, /error\.code === "P2002"/);
});

test("attempt ownership and current academic year are server query constraints", async () => {
  const source = await read("lib/student-practice.ts");
  assert.match(source, /where: \{ id: attemptId, studentId: identity\.student\.id, academicYearId: identity\.academicYear\.id \}/);
  assert.match(source.slice(source.indexOf("loadOwnedAttempt")), /if \(!scope\.entitlement\.allowed\)/);
  assert.match(source.slice(source.indexOf("loadOwnedAttempt")), /isSupportedPracticeQuestion/);
  assert.doesNotMatch(source, /input\.studentId|input\.academicYearId|input\.score|input\.correct|input\.marksAwarded/);
});

test("answer mutation verifies response membership, locks answered rows, and grades server-side", async () => {
  const source = await read("lib/student-practice.ts");
  assert.match(source, /attempt\.responses\.find\(\(item\) => item\.questionId === input\.questionId\)/);
  assert.match(source, /if \(!response \|\| response\.answeredAt\)/);
  assert.match(source, /gradePracticeAnswer\(response\.question/);
  assert.match(source, /where: \{ id: response\.id, answeredAt: null \}/);
});

test("unanswered safe attempt payloads never contain answer keys or explanations", async () => {
  const source = await read("lib/student-practice.ts");
  assert.match(source, /feedback: response\.answeredAt \?/);
  assert.match(source, /studentAnswer: response\.answeredAt \?/);
});

test("submission rejects incomplete attempts and makes submitted attempts immutable", async () => {
  const source = await read("lib/student-practice.ts");
  assert.match(source, /some\(\(response\) => !response\.answeredAt\)/);
  assert.match(source, /status: PracticeAttemptStatus\.SUBMITTED, submittedAt: now/);
  assert.match(source, /attempt\.status !== PracticeAttemptStatus\.IN_PROGRESS/);
});

test("result review is owner-only, submitted-only, and excludes unanswered answer keys", async () => {
  const source = await read("lib/student-practice.ts");
  assert.match(source, /attempt\.status !== PracticeAttemptStatus\.SUBMITTED/);
  assert.match(source, /responses\.filter\(\(response\) => response\.answeredAt\)/);
});

test("practice migrations are ordered, additive, indexed, and avoid altered-enum same-transaction use", async () => {
  const [feature, foundation] = await Promise.all([
    read("prisma/migrations/20260713230000_add_interactive_quizzes_feature_key/migration.sql"),
    read("prisma/migrations/20260713231000_student_practice_engine_foundation/migration.sql"),
  ]);
  assert.match(feature, /ALTER TYPE "PlatformFeatureKey" ADD VALUE 'INTERACTIVE_QUIZZES'/);
  assert.doesNotMatch(feature, /INSERT|UPDATE|CREATE TABLE/i);
  assert.match(foundation, /CREATE TABLE "StudentPracticeAttempt"/);
  assert.match(foundation, /CREATE TABLE "StudentPracticeResponse"/);
  assert.match(foundation, /WHERE "status" = 'IN_PROGRESS'/);
  assert.match(foundation, /FOREIGN KEY/);
  assert.doesNotMatch(feature + foundation, /DROP|TRUNCATE|DELETE FROM/i);
});
