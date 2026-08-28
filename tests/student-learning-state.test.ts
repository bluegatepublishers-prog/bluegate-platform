import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path: string) =>
  readFile(
    new URL(`../${path}`, import.meta.url),
    "utf8",
  );

test("learning-state service is server-only", async () => {
  const source = await read(
    "lib/ai/student-learning-state.ts",
  );

  assert.match(source, /import "server-only"/);
});

test("learning-state service is based on persisted Gap-engine output rather than raw student answers", async () => {
  const source = await read(
    "lib/ai/student-learning-state.ts",
  );

  assert.match(
    source,
    /prisma\.gapAnalysisRun\.findFirst/,
  );

  assert.match(
    source,
    /prisma\.studentLearningGap\.findMany/,
  );

  for (const forbidden of [
    "assessmentResponse",
    "studentPracticeResponse",
    "studentWorksheetResponse",
    "learningTimeline",
    "studentAiMessage",
  ]) {
    assert.doesNotMatch(
      source,
      new RegExp(`prisma\\.${forbidden}`),
    );
  }
});

test("learning-state scope is tenant, student, year, book and chapter bounded", async () => {
  const source = await read(
    "lib/ai/student-learning-state.ts",
  );

  for (const required of [
    "publisherId: scope.publisherId",
    "schoolId: scope.schoolId",
    "studentId: scope.studentId",
    "academicYearId: scope.academicYearId",
    "bookId: scope.bookId",
    "chapterId: scope.chapterId",
  ]) {
    assert.match(
      source,
      new RegExp(
        required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      ),
    );
  }
});

test("learning-state projection independently requires GAP_ANALYSIS entitlement", async () => {
  const source = await read(
    "lib/ai/student-learning-state.ts",
  );

  assert.match(
    source,
    /getPremiumFeatureEntitlementForAuthenticatedUser/,
  );

  assert.match(
    source,
    /feature: "GAP_ANALYSIS"/,
  );

  assert.match(
    source,
    /if \(!entitlement\.allowed\)/,
  );
});

test("only active gap states may influence student learning support", async () => {
  const source = await read(
    "lib/ai/student-learning-state.ts",
  );

  assert.match(source, /GapStatus\.OPEN/);
  assert.match(source, /GapStatus\.ACKNOWLEDGED/);

  assert.doesNotMatch(
    source,
    /GapStatus\.RESOLVED/,
  );

  assert.doesNotMatch(
    source,
    /GapStatus\.DISMISSED/,
  );
});

test("insufficient evidence is explicitly fail-closed", async () => {
  const source = await read(
    "lib/ai/student-learning-state.ts",
  );

  assert.match(
    source,
    /evidenceState: "INSUFFICIENT"/,
  );

  assert.match(
    source,
    /supportState: "NO_SIGNAL"/,
  );

  assert.match(
    source,
    /if \(!latestRun\?\.sufficientEvidenceCount\)/,
  );
});

test("sufficient evidence with no active gap remains neutral", async () => {
  const source = await read(
    "lib/ai/student-learning-state.ts",
  );

  assert.match(
    source,
    /if \(!gaps\.length\)/,
  );

  assert.match(
    source,
    /evidenceState: "SUFFICIENT"/,
  );

  assert.match(
    source,
    /supportState: "NO_SIGNAL"/,
  );
});

test("provider-safe projection exposes only allowlisted learning context", async () => {
  const source = await read(
    "lib/ai/student-learning-state.ts",
  );

  assert.match(
    source,
    /supportLevel: providerSafeSupportLabel/,
  );

  assert.match(
    source,
    /learningArea: projection\.learningArea/,
  );

  assert.match(
    source,
    /guidance: projection\.message/,
  );

  for (const forbidden of [
    "studentId: projection",
    "schoolId: projection",
    "publisherId: projection",
    "academicYearId: projection",
    "gapId: projection",
    "assessmentId: projection",
    "scorePercent: projection",
    "sampleSize: projection",
  ]) {
    assert.doesNotMatch(
      source,
      new RegExp(
        forbidden.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        ),
      ),
    );
  }
});

test("all four deterministic support levels have safe provider labels", async () => {
  const source = await read(
    "lib/ai/student-learning-state.ts",
  );

  for (const label of [
    "A little more practice",
    "Needs attention",
    "Needs focused practice",
    "Teacher support recommended",
  ]) {
    assert.match(
      source,
      new RegExp(
        label.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        ),
      ),
    );
  }
});

test("projection does not create a competing mastery classifier", async () => {
  const source = await read(
    "lib/ai/student-learning-state.ts",
  );

  for (const forbidden of [
    "STRONG",
    "DEVELOPING",
    "NEEDS_SUPPORT",
    "masteryScore",
    "masteryPercent",
  ]) {
    assert.doesNotMatch(
      source,
      new RegExp(forbidden),
    );
  }
});
