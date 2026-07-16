import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { decidePremiumFeatureEntitlement } from "../lib/entitlements/features-policy";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Assessments use the existing publisher feature and premium matrix", async () => {
  const features = await read("lib/entitlements/features.ts");
  assert.match(features, /ASSESSMENTS: PlatformFeatureKey\.ASSESSMENTS/);
  assert.equal(decidePremiumFeatureEntitlement({ plan: "SCHOOL_BASIC", feature: "ASSESSMENTS", publisherFeatureEnabled: true }).allowed, false);
  for (const plan of ["SCHOOL_PREMIUM", "INDIVIDUAL_PREMIUM", "INDIVIDUAL_PREMIUM_MENTOR"] as const) assert.equal(decidePremiumFeatureEntitlement({ plan, feature: "ASSESSMENTS", publisherFeatureEnabled: true }).allowed, true);
  assert.equal(decidePremiumFeatureEntitlement({ plan: "SCHOOL_PREMIUM", feature: "ASSESSMENTS", publisherFeatureEnabled: false }).allowed, false);
});

test("every assessment operation derives identity, tenant, year, section, book, and entitlement on the server", async () => {
  const source = await read("lib/student-assessments.ts");
  assert.match(source, /await requireStudent\(\)/);
  assert.match(source, /publisherId: identity\.publisher\.id/);
  assert.match(source, /schoolId: identity\.school\.id/);
  assert.match(source, /academicYearId: identity\.academicYear\.id/);
  assert.match(source, /sectionId: identity\.enrollment\.sectionId/);
  assert.match(source, /getStudentBook\(assessment\.bookId\)/);
  assert.match(source, /feature: "ASSESSMENTS"/);
});

test("browser cannot submit ownership, timer, score, grade, or answer-key authority", async () => {
  const source = await read("lib/student-assessments.ts");
  assert.doesNotMatch(source, /input\.(studentId|publisherId|schoolId|academicYearId|expiresAt|marksAwarded|correct|score|correctAnswer)/);
  const routes = await read("app/api/student/assessment-attempts/[attemptId]/responses/route.ts");
  assert.match(routes, /assessmentQuestionId.*answer/);
  assert.doesNotMatch(routes, /marksAwarded|correct|studentId|expiresAt/);
});

test("start resumes one active attempt and transactionally creates response membership", async () => {
  const source = await read("lib/student-assessments.ts");
  assert.match(source, /status: AssessmentAttemptStatus\.IN_PROGRESS/);
  assert.match(source, /if \(existing\) return \{ attemptId: existing\.id, resumed: true \}/);
  assert.match(source, /responses: \{ create: scope\.assessment\.questions\.map/);
  assert.match(source, /error\.code === "P2002"/);
});

test("timer is computed and enforced against server time and due date", async () => {
  const source = await read("lib/student-assessments.ts");
  assert.match(source, /calculateAssessmentExpiry\(now, scope\.assessment\.durationMinutes, scope\.assessment\.dueAt\)/);
  assert.match(source, /isAssessmentExpired\(attempt\.expiresAt\)/);
  assert.match(source, /Time is up\. Your saved answers were submitted\./);
});

test("auto grading is server-only while subjective responses remain pending", async () => {
  const source = await read("lib/student-assessments.ts");
  assert.match(source, /gradeAssessmentAnswer\(response\.assessmentQuestion/);
  assert.match(source, /status = summary\.subjectivePending \? AssessmentAttemptStatus\.PENDING_REVIEW/);
  assert.doesNotMatch(source, /getAiProvider|openai|AiProvider|generateStudent|responses\.create/i);
});

test("published snapshots are rechecked against their approved source book and chapter before start", async () => {
  const source = await read("lib/student-assessments.ts");
  assert.match(source, /!question\.question\.approved/);
  assert.match(source, /question\.question\.bookId !== question\.bookId/);
  assert.match(source, /question\.question\.chapterId !== question\.chapterId/);
  assert.match(source, /question\.chapter\.bookId !== assessment\.bookId/);
});

test("submission and result creation share one serializable transaction", async () => {
  const source = await read("lib/student-assessments.ts");
  const finalize = source.slice(source.indexOf("async function finalizeStudentAssessment"));
  assert.match(finalize, /prisma\.\$transaction/);
  assert.match(finalize, /assessmentAttempt\.updateMany/);
  assert.match(finalize, /assessmentResult\.create/);
  assert.match(finalize, /TransactionIsolationLevel\.Serializable/);
});

test("result settings enforce score, answers, explanations, and release timing", async () => {
  const source = await read("lib/student-assessments.ts");
  assert.match(source, /canReleaseAssessmentResult/);
  assert.match(source, /settings\.showScore \?/);
  assert.match(source, /settings\.showCorrectAnswers \?/);
  assert.match(source, /settings\.showExplanations \?/);
  assert.match(source, /AssessmentResultRelease\.AFTER_DUE_DATE/);
});

test("attempt ownership and history queries are student and tenant scoped", async () => {
  const source = await read("lib/student-assessments.ts");
  assert.match(source, /studentId: identity\.student\.id,[\s\S]*publisherId: identity\.publisher\.id,[\s\S]*schoolId: identity\.school\.id,[\s\S]*academicYearId: identity\.academicYear\.id/);
  assert.match(source, /assessment\.sectionId !== identity\.enrollment\.sectionId/);
});

test("mobile assessment UI is one-question-at-a-time with progress, autosave, resume, and no answer feedback", async () => {
  const [player, list] = await Promise.all([read("components/student/StudentAssessmentPlayer.tsx"), read("app/student-dashboard/assessments/page.tsx")]);
  assert.match(player, /Question \{index \+ 1\} of \{attempt\.questions\.length\}/);
  assert.match(player, /setTimeout\(\(\) => void saveAnswer\(dirtyId\), 700\)/);
  assert.match(player, /Submit Assessment/);
  assert.doesNotMatch(player, /correctAnswer|explanation|marksAwarded/);
  assert.match(list, /Resume Assessment/);
});

test("assessment migration is additive, restrictive, indexed, and preserves one active attempt", async () => {
  const sql = await read("prisma/migrations/20260714000000_assessment_engine_foundation/migration.sql");
  for (const table of ["Assessment", "AssessmentSettings", "AssessmentQuestion", "AssessmentAttempt", "AssessmentResponse", "AssessmentResult"]) assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
  assert.match(sql, /WHERE "status" = 'IN_PROGRESS'/);
  assert.match(sql, /ON DELETE RESTRICT/);
  assert.match(sql, /FeatureDefinition/);
  assert.doesNotMatch(sql, /INSERT INTO "PublisherFeature"|UPDATE "PublisherFeature"/);
  assert.doesNotMatch(sql, /DROP|TRUNCATE|DELETE FROM/i);
});

test("seed marks Assessments implemented without globally enabling it", async () => {
  const seed = await read("prisma/seed.ts");
  const implemented = seed.slice(seed.indexOf("const implemented"), seed.indexOf("const enabledForBluegate"));
  const enabled = seed.slice(seed.indexOf("const enabledForBluegate"), seed.indexOf("for (const key"));
  assert.match(implemented, /PlatformFeatureKey\.ASSESSMENTS/);
  assert.doesNotMatch(enabled, /PlatformFeatureKey\.ASSESSMENTS/);
});

test("question bank authoring recognizes match, multiple-select, and named subjective forms", async () => {
  const source = await read("app/admin/books/[id]/knowledge-actions.ts");
  for (const type of ["MATCH", "MULTIPLE_SELECT", "SHORT_ANSWER", "LONG_ANSWER", "CASE_BASED", "COMPETENCY", "HOTS"]) assert.match(source, new RegExp(`"${type}"`));
  assert.match(source, /Left => Right|Match questions need at least two lines/);
});
