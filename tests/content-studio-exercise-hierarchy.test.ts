import assert from "node:assert/strict";
import test from "node:test";

import {
  buildContentStudioTree,
  resolveContentHierarchyContext,
} from "@/lib/content-studio-tree";

test("chapter exercise is rendered as a distinct EXERCISE node", () => {
  const tree = buildContentStudioTree({
    book: {
      id: "book-1",
      title: "Book",
    },
    parts: [],
    units: [],
    chapters: [
      {
        id: "chapter-1",
        title: "Chapter 1",
        archived: false,
        partId: null,
        unitId: null,
        sortOrder: 1,
        counts: {
          outcomes: 0,
          activities: 0,
          worksheets: 0,
          exercises: 0,
          questions: 0,
          assessments: 0,
          resources: 0,
          media: 0,
        },
      },
    ],
    modules: [
      {
        id: "module-exercise",
        title: "Exercise",
        archived: false,
        chapterId: "chapter-1",
        displayOrder: 1,
      },
    ],
    topics: [],
    exercises: [
      {
        id: "exercise-1",
        title: "Exercise",
        archived: false,
        chapterId: "chapter-1",
        moduleId: null,
        topicId: null,
        type: "PRACTICE",
        displayOrder: 1,
      },
    ],
  });

  const chapter = tree.children.find(
    (node) =>
      node.type === "CHAPTER" &&
      node.id === "chapter-1",
  );

  assert.ok(chapter);

  const module = chapter.children.find(
    (node) =>
      node.type === "MODULE" &&
      node.id === "module-exercise",
  );

  const exercise = chapter.children.find(
    (node) =>
      node.type === "EXERCISE" &&
      node.id === "exercise-1",
  );

  assert.ok(module);
  assert.ok(exercise);

  assert.equal(
    module.type,
    "MODULE",
  );

  assert.equal(
    exercise.type,
    "EXERCISE",
  );

  assert.equal(
    exercise.exerciseId,
    "exercise-1",
  );
});

test("a module titled Exercise remains a MODULE", () => {
  assert.deepEqual(
    resolveContentHierarchyContext({
      type: "MODULE",
      id: "module-exercise",
      chapterId: "chapter-1",
    }),
    {
      chapterId: "chapter-1",
      moduleId: "module-exercise",
      exerciseId: null,
    },
  );
});

test("an Exercise hierarchy node resolves chapter and exercise context", () => {
  assert.deepEqual(
    resolveContentHierarchyContext({
      type: "EXERCISE",
      id: "exercise-1",
      chapterId: "chapter-1",
      exerciseId: "exercise-1",
    }),
    {
      chapterId: "chapter-1",
      moduleId: null,
      exerciseId: "exercise-1",
    },
  );
});

test("chapter context resolves without module or exercise", () => {
  assert.deepEqual(
    resolveContentHierarchyContext({
      type: "CHAPTER",
      id: "chapter-1",
    }),
    {
      chapterId: "chapter-1",
      moduleId: null,
      exerciseId: null,
    },
  );
});