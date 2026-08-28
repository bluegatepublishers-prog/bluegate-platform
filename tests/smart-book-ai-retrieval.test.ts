import test from "node:test";
import assert from "node:assert/strict";

import {
  createContentDocument,
  createInfoBoxBlock,
  createListBlock,
  createTextBlock,
  createWorksheetBlock,
  createExerciseBlock,
} from "@/lib/content-document";
import { extractSmartBookAiDocument } from "@/lib/ai/smart-book-retrieval";

test("extracts ordinary educational text from released content blocks", () => {
  const heading = createTextBlock("heading", "Plants Around Us");
  const paragraph = createTextBlock(
    "paragraph",
    "Plants need air, water and sunlight to grow.",
  );
  const list = createListBlock("bulletList", [
    "Plants make food in their leaves.",
    "Roots absorb water from the soil.",
  ]);
  const info = createInfoBoxBlock("remember", {
    title: "Remember",
    text: "Green leaves contain chlorophyll.",
  });

  const document = createContentDocument([
    heading,
    paragraph,
    list,
    info,
  ]);

  const result = extractSmartBookAiDocument(document, "STUDENT");

  assert.equal(result.audience, "STUDENT");
  assert.match(result.text, /Plants Around Us/);
  assert.match(result.text, /Plants need air, water and sunlight/);
  assert.match(result.text, /Roots absorb water from the soil/);
  assert.match(result.text, /Green leaves contain chlorophyll/);

  assert.ok(result.chunks.length >= 4);
});

test("excludes hidden blocks", () => {
  const visible = createTextBlock("paragraph", "Visible learning content.");
  const hidden = {
    ...createTextBlock("paragraph", "Secret hidden content."),
    hidden: true,
  };

  const document = createContentDocument([visible, hidden]);

  const result = extractSmartBookAiDocument(document, "STUDENT");

  assert.match(result.text, /Visible learning content/);
  assert.doesNotMatch(result.text, /Secret hidden content/);
});

test("excludes worksheet and exercise blocks from initial AI grounding", () => {
  const introduction = createTextBlock(
    "paragraph",
    "Fractions show equal parts of a whole.",
  );

  const worksheet = {
    ...createWorksheetBlock(),
    title: "Worksheet",
  };

  const exercise = {
    ...createExerciseBlock(),
    title: "Exercise",
  };

  const document = createContentDocument([
    introduction,
    worksheet,
    exercise,
  ]);

  const result = extractSmartBookAiDocument(document, "STUDENT");

  assert.match(result.text, /Fractions show equal parts of a whole/);

  assert.equal(
    result.chunks.some((chunk) => chunk.blockId === worksheet.id),
    false,
  );

  assert.equal(
    result.chunks.some((chunk) => chunk.blockId === exercise.id),
    false,
  );
});

test("removes NUL characters and normalizes whitespace", () => {
  const paragraph = createTextBlock(
    "paragraph",
    "Water\u0000   is\r\nimportant.\n\n\nPlants need water.",
  );

  const document = createContentDocument([paragraph]);

  const result = extractSmartBookAiDocument(document, "STUDENT");

  assert.equal(result.text.includes("\u0000"), false);
  assert.match(result.text, /Water is/);
  assert.match(result.text, /important/);
  assert.match(result.text, /Plants need water/);
  assert.doesNotMatch(result.text, /\n\n\n/);
});

test("bounds each individual AI chunk", () => {
  const paragraph = createTextBlock("paragraph", "A".repeat(20_000));
  const document = createContentDocument([paragraph]);

  const result = extractSmartBookAiDocument(document, "TEACHER");

  assert.equal(result.audience, "TEACHER");
  assert.equal(result.chunks.length, 1);
  assert.ok(result.chunks[0].text.length <= 4_000);
});

test("bounds the total educational payload before prompt construction", () => {
  const blocks = Array.from({ length: 20 }, (_, index) =>
    createTextBlock(
      "paragraph",
      `Block ${index + 1} ${"X".repeat(3_500)}`,
    ),
  );

  const document = createContentDocument(blocks);

  const result = extractSmartBookAiDocument(document, "STUDENT");

  const educationalCharacters = result.chunks.reduce(
    (sum, chunk) => sum + chunk.text.length,
    0,
  );

  assert.ok(educationalCharacters <= 40_000);
  assert.ok(result.chunks.length < blocks.length);
});

test("does not serialize arbitrary block metadata into educational text", () => {
  const paragraph = {
    ...createTextBlock("paragraph", "The Earth moves around the Sun."),
    internalSecret: "THIS_MUST_NEVER_REACH_AI",
    storageKey: "private/object/key",
    correctAnswer: "hidden answer",
  } as ReturnType<typeof createTextBlock> & {
    internalSecret: string;
    storageKey: string;
    correctAnswer: string;
  };

  const document = createContentDocument([paragraph]);

  const result = extractSmartBookAiDocument(document, "STUDENT");

  assert.match(result.text, /The Earth moves around the Sun/);
  assert.doesNotMatch(result.text, /THIS_MUST_NEVER_REACH_AI/);
  assert.doesNotMatch(result.text, /private\/object\/key/);
  assert.doesNotMatch(result.text, /hidden answer/);
});

test("preserves separate Student and Teacher audience identity", () => {
  const document = createContentDocument([
    createTextBlock("paragraph", "Common released content."),
  ]);

  const student = extractSmartBookAiDocument(document, "STUDENT");
  const teacher = extractSmartBookAiDocument(document, "TEACHER");

  assert.equal(student.audience, "STUDENT");
  assert.equal(teacher.audience, "TEACHER");
  assert.equal(student.text, teacher.text);
});
