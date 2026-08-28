import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const actions = fs.readFileSync(
  "app/teacher-dashboard/ai/actions.ts",
  "utf8",
);

const start = actions.indexOf(
  "export async function generateQuestionPaper",
);
const end = actions.indexOf(
  "function publicGenerationMessage",
  start,
);

assert.ok(start >= 0);
assert.ok(end > start);

const generationAction = actions.slice(
  start,
  end,
);

test(
  "active Question Paper action reauthorizes exact Teacher section subject context",
  () => {
    assert.match(
      generationAction,
      /requireTeacherSubject\(\s*sectionId,\s*sectionSubjectId,\s*\)/,
    );

    assert.match(
      generationAction,
      /scope\.section\.id\s*!==\s*sectionId/,
    );

    assert.match(
      generationAction,
      /subject\.id\s*!==\s*sectionSubjectId/,
    );
  },
);

test(
  "active Question Paper action verifies exact SectionSubject Book",
  () => {
    assert.match(
      generationAction,
      /!subject\.book/,
    );

    assert.match(
      generationAction,
      /subject\.book\.id\s*!==\s*bookId/,
    );
  },
);

test(
  "active Question Paper action requires contextual Book entitlement",
  () => {
    assert.match(
      generationAction,
      /requireBookEntitlement/,
    );

    assert.match(
      generationAction,
      /academicYearId:\s*scope\.academicYear\.id/,
    );

    assert.match(
      generationAction,
      /sectionId:\s*scope\.section\.id/,
    );

    assert.match(
      generationAction,
      /sectionSubjectId:\s*subject\.id/,
    );
  },
);

test(
  "active Question Paper action resolves published immutable Smart Book release server-side",
  () => {
    assert.match(
      generationAction,
      /resolvePublishedSmartBookContent/,
    );

    assert.match(
      generationAction,
      /publisherId:\s*scope\.publisherId/,
    );

    assert.match(
      generationAction,
      /bookId,/,
    );
  },
);

test(
  "active Question Paper action derives released chapters from immutable manifest hierarchy",
  () => {
    assert.match(
      generationAction,
      /release\.manifest\.hierarchy/,
    );

    assert.match(
      generationAction,
      /node\.kind\s*===\s*"CHAPTER"/,
    );

    assert.match(
      generationAction,
      /node\.releaseVisible\s*===\s*true/,
    );

    assert.match(
      generationAction,
      /chapter\.sourceId/,
    );
  },
);

test(
  "whole coverage ignores browser chapter selection and uses all released chapters",
  () => {
    assert.match(
      generationAction,
      /input\.coverage\s*===\s*"whole"\s*\?\s*releasedChapters/,
    );
  },
);

test(
  "selected coverage requires every browser chapter claim to exist in immutable release",
  () => {
    assert.match(
      generationAction,
      /releasedChapterById\.get/,
    );

    assert.match(
      generationAction,
      /chapters\.length\s*!==\s*uniqueChapterIds\.length/,
    );
  },
);

test(
  "active action has no mutable BookChapter readiness dependency",
  () => {
    assert.doesNotMatch(
      generationAction,
      /prisma\.book\.findFirst/,
    );

    assert.doesNotMatch(
      generationAction,
      /\.chapters\.filter/,
    );

    assert.doesNotMatch(
      generationAction,
      /reviewedText/,
    );

    assert.doesNotMatch(
      generationAction,
      /learningOutcomes/,
    );

    assert.doesNotMatch(
      generationAction,
      /\.approved\b/,
    );
  },
);

test(
  "chapter titles and numbers persisted for runtime come from immutable manifest",
  () => {
    assert.match(
      generationAction,
      /id:\s*chapter\.sourceId/,
    );

    assert.match(
      generationAction,
      /name:\s*chapter\.title/,
    );

    assert.match(
      generationAction,
      /chapter\.number\s*\?\?\s*0/,
    );
  },
);

test(
  "browser never supplies release version identity",
  () => {
    const inputTypeStart = actions.indexOf(
      "type GenerateQuestionPaperInput",
    );
    const inputTypeEnd = actions.indexOf(
      "const allowedQuestionTypes",
      inputTypeStart,
    );

    const inputType = actions.slice(
      inputTypeStart,
      inputTypeEnd,
    );

    assert.doesNotMatch(
      inputType,
      /releaseId|releaseVersionId|versionNumber/,
    );

    assert.match(
      generationAction,
      /release\.releaseVersionId/,
    );
  },
);

test(
  "server-authorized class and subject labels are used in runtime configuration",
  () => {
    assert.match(
      generationAction,
      /scope\.schoolClass\.name/,
    );

    assert.match(
      generationAction,
      /subject\.subject\.name/,
    );

    assert.match(
      generationAction,
      /className,/,
    );

    assert.match(
      generationAction,
      /subjectName,/,
    );
  },
);

test(
  "active action retains generation ownership idempotency and immutable runtime handoff",
  () => {
    assert.match(
      generationAction,
      /existing\.teacherId\s*!==\s*teacher\.id/,
    );

    assert.match(
      generationAction,
      /existing\?\.status\s*===\s*"COMPLETED"/,
    );

    assert.match(
      generationAction,
      /existing\?\.providerCalled/,
    );

    assert.match(
      generationAction,
      /executeAiGeneration/,
    );

    assert.match(
      generationAction,
      /configuration,/,
    );
  },
);



