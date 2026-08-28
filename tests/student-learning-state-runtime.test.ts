import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path: string) =>
  readFile(
    new URL(`../${path}`, import.meta.url),
    "utf8",
  );

function escapeRegex(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

test(
  "Ask My Book obtains learning state only through the canonical safe projection service",
  async () => {
    const source = await read("lib/student-ai.ts");

    assert.match(
      source,
      /getStudentLearningStateProjection/,
    );

    assert.match(
      source,
      /toStudentAiLearningStateContext/,
    );

    assert.match(
      source,
      /resolveOptionalStudentLearningState/,
    );

    for (const forbidden of [
      "prisma.studentLearningGap",
      "prisma.gapAnalysisRun",
      "prisma.learningTimeline",
      "prisma.studentSubjectAnalytics",
      "prisma.studentChapterAnalytics",
      "prisma.studentSkillAnalytics",
    ]) {
      assert.doesNotMatch(
        source,
        new RegExp(escapeRegex(forbidden)),
      );
    }
  },
);

test(
  "optional learning-state resolver converts only the safe canonical projection",
  async () => {
    const source = await read("lib/student-ai.ts");

    const start = source.indexOf(
      "async function resolveOptionalStudentLearningState",
    );

    const end = source.indexOf(
      "export async function runStudentAiRequest",
      start,
    );

    assert.ok(start >= 0);
    assert.ok(end > start);

    const helper = source.slice(start, end);

    assert.match(
      helper,
      /getStudentLearningStateProjection\(input\)/,
    );

    assert.match(
      helper,
      /toStudentAiLearningStateContext\(\s*projection,\s*\)/,
    );

    assert.match(
      helper,
      /catch\s*\{/,
    );

    assert.match(
      helper,
      /return null;/,
    );
  },
);

test(
  "learning-state failure removes optional personalisation rather than weakening immutable grounding",
  async () => {
    const source = await read("lib/student-ai.ts");

    const start = source.indexOf(
      "async function resolveOptionalStudentLearningState",
    );

    const end = source.indexOf(
      "export async function runStudentAiRequest",
      start,
    );

    const helper = source.slice(start, end);

    assert.doesNotMatch(
      helper,
      /retrieveStudentSmartBookAiGrounding/,
    );

    assert.doesNotMatch(
      helper,
      /resolveStudentAiScope/,
    );

    assert.doesNotMatch(
      helper,
      /getDeterministicStudentAiRefusal/,
    );

    assert.doesNotMatch(
      helper,
      /reserveStudentAiQuota/,
    );

    assert.doesNotMatch(
      helper,
      /getAiProvider/,
    );
  },
);

test(
  "runtime scopes optional learning state to authenticated Student identity and exact book chapter",
  async () => {
    const source = await read("lib/student-ai.ts");

    const runStart = source.indexOf(
      "export async function runStudentAiRequest",
    );

    assert.ok(runStart >= 0);

    const runtime = source.slice(runStart);

    const start = runtime.indexOf(
      "resolveOptionalStudentLearningState({",
    );

    assert.ok(start >= 0);

    const section = runtime.slice(
      start,
      start + 1000,
    );

    for (const field of [
      "userId: studentUserId",
      "studentId: scope.identity.student.id",
      "academicYearId: scope.identity.academicYear.id",
      "publisherId: scope.identity.publisher.id",
      "schoolId: scope.identity.school.id",
      "bookId",
      "chapterId",
    ]) {
      assert.match(
        section,
        new RegExp(escapeRegex(field)),
      );
    }
  },
);

test(
  "deterministic refusal remains before optional learning state and provider execution",
  async () => {
    const source = await read("lib/student-ai.ts");

    const runStart = source.indexOf(
      "export async function runStudentAiRequest",
    );

    assert.ok(runStart >= 0);

    const runtime = source.slice(runStart);

    const refusal = runtime.indexOf(
      "getDeterministicStudentAiRefusal({",
    );

    const learningState = runtime.indexOf(
      "resolveOptionalStudentLearningState({",
    );

    const provider = runtime.indexOf(
      "getAiProvider(resolveProviderId())",
    );

    const reserve = runtime.indexOf(
      "reserveStudentAiQuota({",
    );

    assert.ok(refusal >= 0);
    assert.ok(learningState > refusal);
    assert.ok(provider > learningState);
    assert.ok(reserve > learningState);
  },
);

test(
  "learning state remains separate from immutable Smart Book grounding",
  async () => {
    const source = await read("lib/student-ai.ts");

    const runStart = source.indexOf(
      "export async function runStudentAiRequest",
    );

    const runtime = source.slice(runStart);

    assert.match(
      runtime,
      /grounding:\s*scope\.grounding/,
    );

    assert.match(
      runtime,
      /learningState/,
    );

    assert.doesNotMatch(
      runtime,
      /grounding\s*:\s*learningState/,
    );
  },
);

test(
  "Ask My Book API contract remains unchanged and clients cannot supply learning state",
  async () => {
    const route = await read(
      "app/api/student/assistant/route.ts",
    );

    assert.match(
      route,
      /runStudentAiRequest\(body\)/,
    );

    assert.doesNotMatch(
      route,
      /learningState|supportLevel|learningArea|guidance/,
    );
  },
);