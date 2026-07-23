import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmptyBookFormData,
  parseBookFormData,
  toBookPersistenceData,
  toVisibleBookFormPayload,
} from "../lib/book-form-data";

test("book form data round-trips content persistence fields", () => {
  const parsed = parseBookFormData({
    title: "Bluegate Science",
    board: "CBSE",
    weight: "450 g",
    pages: 128,
    features: ["Activity based", "QR support"],
    learningOutcomes: ["Observe changes", "Compare results"],
    tableOfContents: ["Unit 1", "Unit 2"],
    classId: "class-1",
    subjectId: "subject-1",
    seriesId: "series-1",
    featured: true,
    featuredOrder: 3,
    published: false,
  });

  assert.deepEqual(parsed.features, ["Activity based", "QR support"]);
  assert.deepEqual(parsed.learningOutcomes, ["Observe changes", "Compare results"]);
  assert.deepEqual(parsed.tableOfContents, ["Unit 1", "Unit 2"]);
  assert.equal(parsed.board, "CBSE");
  assert.equal(parsed.weight, "450 g");

  const persisted = toBookPersistenceData(parsed);
  assert.deepEqual(persisted.features, ["Activity based", "QR support"]);
  assert.deepEqual(persisted.learningOutcomes, ["Observe changes", "Compare results"]);
  assert.deepEqual(persisted.tableOfContents, ["Unit 1", "Unit 2"]);
  assert.equal(persisted.board, "CBSE");
  assert.equal(persisted.weight, "450 g");
  assert.equal(persisted.featuredOrder, 3);
});

test("book form payload hides presentation-only fields but preserves editable values", () => {
  const payload = toVisibleBookFormPayload({
    ...createEmptyBookFormData(),
    title: "Bluegate Maths",
    subtitle: "Learner edition",
    description: "Public description",
    galleryImages: ["https://example.com/image.jpg"],
    edition: "2026",
    publisher: "Bluegate",
    language: "English",
    board: "CBSE",
    binding: "Hardcover",
    dimensions: "20 x 25 cm",
    classId: "class-1",
    subjectId: "subject-1",
    featuredOrder: 4,
  });

  assert.equal(payload.title, "Bluegate Maths");
  assert.equal("subtitle" in payload, false);
  assert.equal("description" in payload, false);
  assert.equal("galleryImages" in payload, false);
  assert.equal("board" in payload, false);
  assert.equal(payload.classId, "class-1");
  assert.equal(payload.subjectId, "subject-1");
  assert.equal(payload.featuredOrder, 4);
});
