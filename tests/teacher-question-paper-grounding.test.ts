import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const path =
  "lib/ai/teacher-question-paper-grounding.ts";

const source = fs.readFileSync(path, "utf8");

test(
  "Question Paper grounding uses immutable Teacher Smart Book retrieval",
  () => {
    assert.match(
      source,
      /retrieveTeacherSmartBookAiGrounding/,
    );

    assert.doesNotMatch(
      source,
      /collectBookKnowledge/,
    );

    assert.doesNotMatch(
      source,
      /knowledge-collector/,
    );

    assert.doesNotMatch(
      source,
      /prisma\./,
    );
  },
);

test(
  "every requested chapter is resolved through Teacher immutable retrieval",
  () => {
    assert.match(
      source,
      /for\s*\(const chapterId of chapterIds\)/,
    );

    assert.match(
      source,
      /retrieveTeacherSmartBookAiGrounding\(\s*\{[\s\S]*sectionId,[\s\S]*sectionSubjectId,[\s\S]*bookId,[\s\S]*chapterId,[\s\S]*\}\s*\)/,
    );
  },
);

test(
  "Question Paper grounding fails closed when any chapter cannot be resolved",
  () => {
    assert.match(
      source,
      /if\s*\(!grounding\)\s*\{\s*return null;/,
    );
  },
);

test(
  "Question Paper grounding rejects mixed immutable releases",
  () => {
    assert.match(
      source,
      /grounding\.release\.releaseVersionId\s*!==\s*canonical\.release\.releaseVersionId/,
    );

    assert.match(
      source,
      /grounding\.release\.releaseId\s*!==\s*canonical\.release\.releaseId/,
    );

    assert.match(
      source,
      /grounding\.release\.versionNumber\s*!==\s*canonical\.release\.versionNumber/,
    );
  },
);

test(
  "Question Paper grounding rejects mixed academic contexts",
  () => {
    assert.match(
      source,
      /grounding\.academic\.schoolId\s*!==\s*canonical\.academic\.schoolId/,
    );

    assert.match(
      source,
      /grounding\.academic\.academicYearId\s*!==\s*canonical\.academic\.academicYearId/,
    );

    assert.match(
      source,
      /grounding\.academic\.sectionId\s*!==\s*canonical\.academic\.sectionId/,
    );

    assert.match(
      source,
      /grounding\.academic\.sectionSubjectId\s*!==\s*canonical\.academic\.sectionSubjectId/,
    );

    assert.match(
      source,
      /grounding\.academic\.subjectId\s*!==\s*canonical\.academic\.subjectId/,
    );
  },
);

test(
  "Question Paper grounding rejects mixed books",
  () => {
    assert.match(
      source,
      /grounding\.book\.id\s*!==\s*canonical\.book\.id/,
    );
  },
);

test(
  "caller context claims are rechecked against authorised canonical context",
  () => {
    assert.match(
      source,
      /canonical\.academic\.sectionId\s*!==\s*sectionId/,
    );

    assert.match(
      source,
      /canonical\.academic\.sectionSubjectId\s*!==\s*sectionSubjectId/,
    );

    assert.match(
      source,
      /canonical\.book\.id\s*!==\s*bookId/,
    );
  },
);

test(
  "provider projection is explicitly bounded",
  () => {
    assert.match(
      source,
      /MAX_PROVIDER_CHUNK_CHARS\s*=\s*4_000/,
    );

    assert.match(
      source,
      /MAX_PROVIDER_TOTAL_CHARS\s*=\s*80_000/,
    );

    assert.match(
      source,
      /remaining\s*=\s*MAX_PROVIDER_TOTAL_CHARS/,
    );

    assert.match(
      source,
      /MAX_PROVIDER_CHUNK_CHARS/,
    );
  },
);

test(
  "provider projection contains only human-readable label and educational text",
  () => {
    const typeStart = source.indexOf(
      "export type TeacherQuestionPaperProviderChunk",
    );

    const typeEnd = source.indexOf(
      "export type TeacherQuestionPaperGrounding",
    );

    assert.ok(typeStart >= 0);
    assert.ok(typeEnd > typeStart);

    const providerType = source.slice(
      typeStart,
      typeEnd,
    );

    assert.match(
      providerType,
      /label:\s*string/,
    );

    assert.match(
      providerType,
      /text:\s*string/,
    );

    assert.doesNotMatch(
      providerType,
      /releaseVersionId|releaseId|schoolId|academicYearId|sectionId|sectionSubjectId|subjectId|bookId|chapterId|blockId|moduleId/,
    );
  },
);

test(
  "provider projection does not serialize immutable citation objects",
  () => {
    const projectionStart = source.indexOf(
      "function buildBoundedProviderProjection",
    );

    assert.ok(projectionStart >= 0);

    const projection = source.slice(
      projectionStart,
    );

    assert.match(
      projection,
      /chunk\.citation\.label/,
    );

    assert.match(
      projection,
      /chunk\.text/,
    );

    assert.doesNotMatch(
      projection,
      /JSON\.stringify\s*\(\s*chunk\.citation/,
    );

    assert.doesNotMatch(
      projection,
      /providerChunks\.push\(\s*chunk/,
    );
  },
);

test(
  "duplicate chapter claims are rejected",
  () => {
    assert.match(
      source,
      /seen\.has\(chapterId\)/,
    );

    assert.match(
      source,
      /if\s*\(seen\.has\(chapterId\)\)\s*\{\s*return \[\];/,
    );
  },
);

test(
  "Question Paper grounding remains Teacher-only",
  () => {
    assert.match(
      source,
      /audience:\s*"TEACHER"/,
    );

    assert.doesNotMatch(
      source,
      /audience:\s*"STUDENT"/,
    );
  },
);
