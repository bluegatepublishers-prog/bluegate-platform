import assert from "node:assert/strict";
import test from "node:test";

import {
  buildImmutableStudentLearningPrompt,
} from "../lib/ai/prompt-builder";
import type {
  StudentImmutableGrounding,
} from "../lib/ai/types";

const grounding: StudentImmutableGrounding = {
  audience: "STUDENT",

  release: {
    releaseId: "internal-release",
    releaseVersionId: "internal-release-version",
    versionNumber: 4,
  },

  book: {
    id: "internal-book",
    title: "Living Mathematics 4",
  },

  chapter: {
    id: "internal-chapter",
    title: "Fractions",
    number: 6,
  },

  sectionSubjectId: "internal-section-subject",

  chunks: [
    {
      id: "internal-chunk",
      text: "A fraction represents equal parts of a whole.",

      citation: {
        sourceType: "SMART_BOOK_RELEASE",
        releaseVersionId: "internal-release-version",
        bookId: "internal-book",
        chapterId: "internal-chapter",
        moduleId: "internal-module",
        moduleTitle: "Understanding Fractions",
        blockId: "internal-block",
        blockType: "TEXT",
        label: "Fractions - Understanding Fractions",
      },
    },
  ],

  text: "A fraction represents equal parts of a whole.",
};

const request = {
  intent: "EXPLAIN_CONCEPT" as const,
  requestId: "request-1",
  reference: "Fractions",
  question: null,
};

test(
  "immutable Student prompt accepts only the provider-safe learning-state projection",
  () => {
    const prompt = buildImmutableStudentLearningPrompt({
      request,
      grounding,
      history: [],

      learningState: {
        supportLevel: "Needs focused practice",
        learningArea: "Fractions",
        guidance:
          "Recent scored learning activity suggests that focused practice may help in this learning area.",
      },
    });

    assert.match(
      prompt.userPrompt,
      /OPTIONAL_LEARNING_SUPPORT_CONTEXT_JSON/,
    );

    assert.match(
      prompt.userPrompt,
      /Needs focused practice/,
    );

    assert.match(
      prompt.userPrompt,
      /"learningArea": "Fractions"/,
    );

    assert.match(
      prompt.userPrompt,
      /focused practice may help/,
    );
  },
);

test(
  "learning support is explicitly guidance rather than educational grounding or diagnosis",
  () => {
    const prompt = buildImmutableStudentLearningPrompt({
      request,
      grounding,
      history: [],

      learningState: {
        supportLevel: "Needs attention",
        learningArea: "Fractions",
        guidance:
          "Recent scored learning activity suggests that this learning area needs some attention.",
      },
    });

    assert.match(
      prompt.systemPrompt,
      /guidance for explanation style only/i,
    );

    assert.match(
      prompt.systemPrompt,
      /not textbook grounding/i,
    );

    assert.match(
      prompt.systemPrompt,
      /a diagnosis/i,
    );

    assert.match(
      prompt.systemPrompt,
      /permission to add unsupported facts/i,
    );
  },
);

test(
  "prompt remains valid when no learning-state signal exists",
  () => {
    const prompt = buildImmutableStudentLearningPrompt({
      request,
      grounding,
      history: [],
      learningState: null,
    });

    assert.match(
      prompt.userPrompt,
      /OPTIONAL_LEARNING_SUPPORT_CONTEXT_JSON:\s*\n\s*null/,
    );

    assert.match(
      prompt.userPrompt,
      /IMMUTABLE_RELEASED_SMART_BOOK_GROUNDING_JSON/,
    );
  },
);

test(
  "provider grounding still strips internal immutable release identifiers",
  () => {
    const prompt = buildImmutableStudentLearningPrompt({
      request,
      grounding,
      history: [],

      learningState: {
        supportLevel: "A little more practice",
        learningArea: "Fractions",
        guidance: "Practise this learning area.",
      },
    });

    for (const secret of [
      "internal-release",
      "internal-release-version",
      "internal-book",
      "internal-chapter",
      "internal-section-subject",
      "internal-module",
      "internal-block",
      "internal-chunk",
    ]) {
      assert.doesNotMatch(
        prompt.systemPrompt + prompt.userPrompt,
        new RegExp(secret),
      );
    }
  },
);

test(
  "Student prompt forbids exposing analytics details behind support context",
  () => {
    const prompt = buildImmutableStudentLearningPrompt({
      request,
      grounding,
      history: [],
      learningState: null,
    });

    for (const protectedTerm of [
      "marks",
      "scores",
      "percentages",
      "evidence records",
      "gap records",
    ]) {
      assert.match(
        prompt.systemPrompt,
        new RegExp(protectedTerm, "i"),
      );
    }
  },
);