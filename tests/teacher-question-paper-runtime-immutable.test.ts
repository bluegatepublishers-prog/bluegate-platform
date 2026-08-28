import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runtime = fs.readFileSync(
  "lib/ai/runtime/execute.ts",
  "utf8",
);

const promptBuilder = fs.readFileSync(
  "lib/ai/prompt-builder.ts",
  "utf8",
);

test(
  "active Teacher Question Paper runtime uses immutable multi-chapter grounding",
  () => {
    assert.match(
      runtime,
      /retrieveTeacherQuestionPaperGrounding/,
    );

    assert.match(
      runtime,
      /await retrieveTeacherQuestionPaperGrounding/,
    );
  },
);

test(
  "active Teacher runtime no longer imports or calls mutable book knowledge collector",
  () => {
    assert.doesNotMatch(
      runtime,
      /collectBookKnowledge/,
    );

    assert.doesNotMatch(
      runtime,
      /knowledge-collector/,
    );

    assert.doesNotMatch(
      runtime,
      /KnowledgePackage/,
    );
  },
);

test(
  "runtime requires exact section section-subject book and chapter claims",
  () => {
    assert.match(
      runtime,
      /academic\.sectionId/,
    );

    assert.match(
      runtime,
      /academic\.sectionSubjectId/,
    );

    assert.match(
      runtime,
      /academic\.bookId/,
    );

    assert.match(
      runtime,
      /record\(value\)\.id/,
    );
  },
);

test(
  "runtime rejects missing and duplicate chapter claims",
  () => {
    assert.match(
      runtime,
      /!chapterIds\.length/,
    );

    assert.match(
      runtime,
      /new Set\(chapterIds\)\.size\s*!==\s*chapterIds\.length/,
    );
  },
);

test(
  "runtime fails closed when immutable grounding cannot be prepared",
  () => {
    assert.match(
      runtime,
      /if\s*\(!grounding\)\s*\{[\s\S]*KNOWLEDGE_PREPARATION_FAILED/,
    );
  },
);

test(
  "runtime builds the provider request only from immutable Teacher prompt builder",
  () => {
    assert.match(
      runtime,
      /buildImmutableTeacherQuestionPaperPrompt/,
    );

    assert.doesNotMatch(
      runtime,
      /buildQuestionPaperPrompt/,
    );
  },
);

test(
  "runtime retains existing Teacher quota lifecycle",
  () => {
    assert.match(
      runtime,
      /assertCanGenerate/,
    );

    assert.match(
      runtime,
      /reserveQuota/,
    );

    assert.match(
      runtime,
      /consumeQuota/,
    );

    assert.match(
      runtime,
      /releaseQuota/,
    );
  },
);

test(
  "runtime retains provider response validation and persistence",
  () => {
    assert.match(
      runtime,
      /validateProviderResponse/,
    );

    assert.match(
      runtime,
      /provider\.generate\(request\)/,
    );

    assert.match(
      runtime,
      /prisma\.aiGeneration\.update/,
    );
  },
);

test(
  "immutable Teacher prompt uses only provider-safe grounding chunks",
  () => {
    const start =
      promptBuilder.indexOf(
        "export function buildImmutableTeacherQuestionPaperPrompt",
      );

    const end =
      promptBuilder.indexOf(
        "export function buildStudentLearningPrompt",
        start,
      );

    assert.ok(start >= 0);
    assert.ok(end > start);

    const teacherPrompt =
      promptBuilder.slice(
        start,
        end,
      );

    assert.match(
      teacherPrompt,
      /input\.grounding\.providerChunks\.map/,
    );

    assert.match(
      teacherPrompt,
      /label:\s*chunk\.label/,
    );

    assert.match(
      teacherPrompt,
      /text:\s*chunk\.text/,
    );

    assert.match(
      teacherPrompt,
      /IMMUTABLE_RELEASED_SMART_BOOK_GROUNDING_JSON/,
    );
  },
);

test(
  "Teacher provider grounding projection does not reference internal authorization or release identifiers",
  () => {
    const start =
      promptBuilder.indexOf(
        "const providerGrounding =",
        promptBuilder.indexOf(
          "export function buildImmutableTeacherQuestionPaperPrompt",
        ),
      );

    const end =
      promptBuilder.indexOf(
        "const systemPrompt",
        start,
      );

    assert.ok(start >= 0);
    assert.ok(end > start);

    const projection =
      promptBuilder.slice(
        start,
        end,
      );

    assert.doesNotMatch(
      projection,
      /releaseVersionId|releaseId|schoolId|academicYearId|sectionId|sectionSubjectId|subjectId|bookId|chapterId|blockId|moduleId/,
    );
  },
);

test(
  "Teacher provider configuration is reconstructed instead of serializing raw browser configuration",
  () => {
    const start =
      promptBuilder.indexOf(
        "function buildTeacherProviderConfiguration",
      );

    assert.ok(start >= 0);

    const builder =
      promptBuilder.slice(start);

    assert.match(
      builder,
      /settings:\s*\{/,
    );

    assert.match(
      builder,
      /blueprint:/,
    );

    assert.match(
      builder,
      /outputRequirements:/,
    );

    assert.doesNotMatch(
      builder,
      /return\s+configuration\s*;/,
    );
  },
);

test(
  "active Teacher runtime does not query mutable authoring chapter state",
  () => {
    assert.doesNotMatch(
      runtime,
      /bookChapter|BookChapter/,
    );

    assert.doesNotMatch(
      runtime,
      /bookQuestion|BookQuestion/,
    );

    assert.doesNotMatch(
      runtime,
      /reviewedText/,
    );

    assert.doesNotMatch(
      runtime,
      /learningOutcomes/,
    );

    assert.doesNotMatch(
      runtime,
      /approvedOnly|APPROVED_ONLY/,
    );
  },
);
