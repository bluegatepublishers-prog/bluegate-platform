import assert from "node:assert/strict";
import test from "node:test";

import {
  extractStudentImmutableVocabulary,
} from "../lib/ai/student-immutable-vocabulary";

import type {
  StudentImmutableGrounding,
} from "../lib/ai/types";

function grounding(
  chunks: Array<{
    text: string;
    blockType?: string;
  }>,
): StudentImmutableGrounding {
  return {
    audience: "STUDENT",

    release: {
      releaseId: "release-safe",
      releaseVersionId:
        "release-version-safe",
      versionNumber: 1,
    },

    book: {
      id: "book-safe",
      title: "Living Science",
    },

    chapter: {
      id: "chapter-safe",
      title: "Photosynthesis",
      number: 4,
    },

    sectionSubjectId:
      "section-subject-safe",

    chunks: chunks.map(
      (chunk, index) => ({
        id: `chunk-${index}`,
        text: chunk.text,

        citation: {
          sourceType:
            "SMART_BOOK_RELEASE",
          releaseVersionId:
            "release-version-safe",
          bookId: "book-safe",
          chapterId:
            "chapter-safe",
          moduleId: "module-safe",
          moduleTitle:
            "Green Plants",
          blockId:
            `block-${index}`,
          blockType:
            (chunk.blockType ??
              "paragraph") as never,
          label:
            "Photosynthesis - Green Plants",
        },
      }),
    ),

    text: chunks
      .map((chunk) => chunk.text)
      .join("\n\n"),
  };
}

test(
  "extracts repeated educational terms from immutable Student grounding",
  () => {
    const result =
      extractStudentImmutableVocabulary(
        grounding([
          {
            text:
              "Chlorophyll helps green leaves capture sunlight. Chlorophyll is present in green leaves.",
          },
          {
            text:
              "Plants use sunlight during photosynthesis. Photosynthesis helps plants prepare food.",
          },
        ]),
      );

    assert.ok(
      result.some(
        (term) =>
          term.toLowerCase() ===
          "chlorophyll",
      ),
    );

    assert.ok(
      result.some(
        (term) =>
          term.toLowerCase() ===
          "photosynthesis",
      ),
    );

    assert.ok(
      result.some(
        (term) =>
          term.toLowerCase() ===
          "sunlight",
      ),
    );
  },
);

test(
  "heading terms can qualify without repetition",
  () => {
    const result =
      extractStudentImmutableVocabulary(
        grounding([
          {
            blockType: "heading",
            text: "Transpiration",
          },
          {
            text:
              "Water moves through the plant.",
          },
        ]),
      );

    assert.ok(
      result.includes(
        "Transpiration",
      ),
    );
  },
);

test(
  "ordinary one-off prose words are not promoted as vocabulary",
  () => {
    const result =
      extractStudentImmutableVocabulary(
        grounding([
          {
            text:
              "Students carefully observe a simple classroom demonstration today.",
          },
        ]),
      );

    assert.deepEqual(
      result,
      [],
    );
  },
);

test(
  "common function words and chapter noise are excluded",
  () => {
    const result =
      extractStudentImmutableVocabulary(
        grounding([
          {
            text:
              "This chapter shows that plants have leaves and that plants have roots.",
          },
          {
            text:
              "Plants grow because plants need water.",
          },
        ]),
      );

    const lower =
      result.map((term) =>
        term.toLowerCase(),
      );

    assert.equal(
      lower.includes("chapter"),
      false,
    );

    assert.equal(
      lower.includes("this"),
      false,
    );

    assert.equal(
      lower.includes("that"),
      false,
    );

    assert.equal(
      lower.includes("have"),
      false,
    );
  },
);

test(
  "terms are deduplicated case-insensitively",
  () => {
    const result =
      extractStudentImmutableVocabulary(
        grounding([
          {
            text:
              "Chlorophyll chlorophyll CHLOROPHYLL.",
          },
        ]),
      );

    assert.equal(
      result.filter(
        (term) =>
          term.toLowerCase() ===
          "chlorophyll",
      ).length,
      1,
    );
  },
);

test(
  "vocabulary is bounded",
  () => {
    const words = Array.from(
      { length: 40 },
      (_, index) =>
        `conceptword${String.fromCharCode(
          97 + (index % 26),
        )}`,
    );

    const result =
      extractStudentImmutableVocabulary(
        grounding([
          {
            text: [
              ...words,
              ...words,
            ].join(" "),
          },
        ]),
      );

    assert.ok(
      result.length <= 24,
    );
  },
);

test(
  "caller may request a smaller bound",
  () => {
    const result =
      extractStudentImmutableVocabulary(
        grounding([
          {
            text:
              "chlorophyll chlorophyll sunlight sunlight photosynthesis photosynthesis respiration respiration",
          },
        ]),
        2,
      );

    assert.equal(
      result.length,
      2,
    );
  },
);

test(
  "zero or invalid limits fail closed",
  () => {
    const source =
      grounding([
        {
          text:
            "chlorophyll chlorophyll",
        },
      ]);

    assert.deepEqual(
      extractStudentImmutableVocabulary(
        source,
        0,
      ),
      [],
    );

    assert.deepEqual(
      extractStudentImmutableVocabulary(
        source,
        -1,
      ),
      [],
    );

    assert.deepEqual(
      extractStudentImmutableVocabulary(
        source,
        1.5,
      ),
      [],
    );
  },
);
