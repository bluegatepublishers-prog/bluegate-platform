import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const adapterPath =
  "lib/ai/teacher-smart-book-retrieval.ts";

const deliveryPath =
  "lib/content-delivery.ts";

const extractorPath =
  "lib/ai/smart-book-retrieval.ts";

const adapter = fs.readFileSync(adapterPath, "utf8");
const delivery = fs.readFileSync(deliveryPath, "utf8");
const extractor = fs.readFileSync(extractorPath, "utf8");

test(
  "Teacher AI retrieval delegates authorization to Teacher content delivery",
  () => {
    assert.match(
      adapter,
      /loadTeacherChapterStructuredContent/,
    );

    assert.match(adapter, /sectionId/);
    assert.match(adapter, /sectionSubjectId/);
    assert.match(adapter, /bookId/);
    assert.match(adapter, /chapterId/);
  },
);

test(
  "Teacher content delivery exposes the exact resolved immutable release",
  () => {
    assert.match(
      delivery,
      /releaseId:\s*release\.releaseId/,
    );

    assert.match(
      delivery,
      /releaseVersionId:\s*release\.releaseVersionId/,
    );

    assert.match(
      delivery,
      /versionNumber:\s*release\.versionNumber/,
    );
  },
);

test(
  "Teacher grounding uses the shared immutable Smart Book extractor",
  () => {
    assert.match(
      adapter,
      /extractSmartBookAiDocument/,
    );

    assert.match(
      adapter,
      /item\.document/,
    );

    assert.match(
      adapter,
      /"TEACHER"/,
    );
  },
);

test(
  "Teacher grounding requires immutable release-derived items",
  () => {
    assert.match(
      adapter,
      /item\.immutableRelease/,
    );
  },
);

test(
  "Teacher grounding carries exact release provenance internally",
  () => {
    assert.match(
      adapter,
      /structured\.release\.releaseId/,
    );

    assert.match(
      adapter,
      /structured\.release\.releaseVersionId/,
    );

    assert.match(
      adapter,
      /structured\.release\.versionNumber/,
    );
  },
);

test(
  "Teacher grounding performs no direct Prisma or mutable authoring query",
  () => {
    assert.doesNotMatch(
      adapter,
      /import\s+.*prisma/,
    );

    assert.doesNotMatch(
      adapter,
      /prisma\./,
    );

    assert.doesNotMatch(
      adapter,
      /collectBookKnowledge\s*\(/,
    );

    assert.doesNotMatch(
      adapter,
      /reviewedText\s*:/,
    );

    assert.doesNotMatch(
      adapter,
      /extractedText\s*:/,
    );

    assert.doesNotMatch(
      adapter,
      /prisma\.bookChapter/,
    );

    assert.doesNotMatch(
      adapter,
      /prisma\.bookQuestion/,
    );
  },
);

test(
  "shared extractor continues excluding worksheet and exercise blocks",
  () => {
    assert.match(
      extractor,
      /case\s+"worksheet":/,
    );

    assert.match(
      extractor,
      /case\s+"exercise":/,
    );
  },
);

test(
  "Teacher grounding retains server-side academic context",
  () => {
    assert.match(adapter, /schoolId/);
    assert.match(adapter, /academicYearId/);
    assert.match(adapter, /sectionId/);
    assert.match(adapter, /sectionSubjectId/);
    assert.match(adapter, /subjectId/);
  },
);

test(
  "Teacher grounding citations are bound to the exact release version",
  () => {
    assert.match(
      adapter,
      /sourceType:\s*"SMART_BOOK_RELEASE"/,
    );

    assert.match(
      adapter,
      /releaseVersionId:\s*structured\.release\.releaseVersionId/,
    );
  },
);

test(
  "Teacher adapter rechecks caller claims against authorised context",
  () => {
    assert.match(
      adapter,
      /structured\.bookId\s*!==\s*bookId/,
    );

    assert.match(
      adapter,
      /resolvedSectionId\s*!==\s*sectionId/,
    );

    assert.match(
      adapter,
      /resolvedSectionSubjectId\s*!==\s*sectionSubjectId/,
    );
  },
);

test(
  "Teacher grounding is explicitly Teacher audience",
  () => {
    assert.match(
      adapter,
      /audience:\s*"TEACHER"/,
    );
  },
);

test(
  "Teacher grounding does not perform a second Smart Book release lookup",
  () => {
    assert.doesNotMatch(
      adapter,
      /resolvePublishedSmartBookContent/,
    );

    assert.doesNotMatch(
      adapter,
      /resolveSmartBookContentReleaseVersion/,
    );
  },
);
