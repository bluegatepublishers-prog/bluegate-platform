import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  addActivityField,
  createContentDocument,
  createActivityBlock,
  createEducationalObjectBlock,
  createImageBlock,
  createMediaBlock,
  createTextBlock,
  duplicateBlock,
  createWorksheetBlock,
  createExerciseBlock,
  duplicateWorksheetQuestion,
  moveWorksheetQuestion,
  removeWorksheetQuestion,
  addWorksheetQuestion,
  isWorksheetBlock,
  createTableBlock,
  deleteTableColumn,
  deleteTableRow,
  insertTableColumn,
  insertTableRow,
  mergeTableCells,
  moveActivityField,
  normalizeContentDocument,
  removeActivityField,
  serializeContentDocument,
  splitTableCell,
} from "../lib/content-document";
import { WORKSHEET_QUESTION_TYPES, createWorksheetQuestion, normalizeWorksheetBlock } from "../lib/worksheet-object";
import { createWorksheetPdf, worksheetFilename, worksheetToPlainLines } from "../lib/worksheet-export";
import { addExerciseGroup as addExerciseObjectGroup, addExerciseQuestion as addExerciseObjectQuestion, createExerciseGroup, createExerciseQuestion, duplicateExerciseQuestion as duplicateExerciseObjectQuestion, moveExerciseGroup as moveExerciseObjectGroup, moveExerciseQuestion as moveExerciseObjectQuestion, normalizeExerciseBlock, removeExerciseGroup as removeExerciseObjectGroup, removeExerciseQuestion as removeExerciseObjectQuestion } from "../lib/exercise-object";
import {
  EDUCATIONAL_OBJECT_REGISTRY,
  getEducationalObjectDefinition,
} from "../lib/educational-object-registry";

test("the educational object registry exposes the full authoring vocabulary", () => {
  assert.equal(EDUCATIONAL_OBJECT_REGISTRY.length, 15);
  assert.equal(getEducationalObjectDefinition("didYouKnow").defaultTitle, "Do You Know?");
  assert.equal(getEducationalObjectDefinition("teacherNote").label, "Teacher Note");
});

test("the compact Insert ribbon exposes educational objects without a permanent button wall", () => {
  const ribbon = readFileSync(new URL("../components/admin/books/editor/WordRibbon.tsx", import.meta.url), "utf8");
  assert.match(ribbon, /Educational Element/);
  assert.match(ribbon, /EDUCATIONAL_OBJECT_REGISTRY/);
  assert.match(ribbon, /featureOpen/);
});

test("educational insertion creates an immediately editable canonical object", () => {
  const document = createContentDocument([createEducationalObjectBlock("thinkAndDiscuss")]);
  const block = document.blocks[0];
  assert.equal(block.type, "educationalObject");
  if (block.type !== "educationalObject") return;
  assert.equal(block.objectType, "thinkAndDiscuss");
  assert.equal(block.title, "Think and Discuss");
  assert.equal(block.text, "");
});

test("authoring UI keeps table controls compact and media canvas free of resource administration", () => {
  const tableEditor = readFileSync(new URL("../components/admin/books/editor/blocks/TableBlockEditor.tsx", import.meta.url), "utf8");
  const mediaEditor = readFileSync(new URL("../components/admin/books/editor/blocks/MediaBlockEditor.tsx", import.meta.url), "utf8");
  const renderer = readFileSync(new URL("../components/content/StructuredContentRenderer.tsx", import.meta.url), "utf8");
  const mediaSurface = mediaEditor.split("function resolveMediaForBlock")[0];
  assert.match(tableEditor, /<details/);
  assert.match(tableEditor, /Add row above/);
  assert.doesNotMatch(tableEditor, />Row above</);
  assert.doesNotMatch(mediaSurface, /Publisher Resource|Source detail|Scope label|>Audience</);
  assert.match(renderer, /media\.displayMode === "button"/);
  assert.match(renderer, /aria-hidden="true">▶/);
});

test("image resource creation carries the manuscript hierarchy scope", () => {
  const editor = readFileSync(new URL("../components/admin/books/ContentManuscriptEditor.tsx", import.meta.url), "utf8");
  assert.match(editor, /bookId,/);
  assert.match(editor, /chapterId,/);
  assert.match(editor, /moduleId: nodeType === "MODULE" \? nodeId : undefined/);
});

test("the image ResourceType migration remains part of the checked-in release", () => {
  const migration = readFileSync(new URL("../prisma/migrations/20260806000000_add_image_resource_type/migration.sql", import.meta.url), "utf8");
  assert.match(migration, /ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'IMAGE';/);
});

test("canvas previews use final visual objects and defer editors to explicit properties", () => {
  const editor = readFileSync(new URL("../components/admin/books/ContentManuscriptEditor.tsx", import.meta.url), "utf8");
  const imageEditor = readFileSync(new URL("../components/admin/books/editor/blocks/ImageBlockEditor.tsx", import.meta.url), "utf8");
  const previewRoute = readFileSync(new URL("../app/api/admin/resources/[id]/preview/route.ts", import.meta.url), "utf8");
  assert.match(editor, /<ContentDocumentRenderer/);
  assert.match(editor, /selected && propertiesOpen/);
  assert.match(editor, /Type learning outcome here/);
  assert.match(editor, /contentResourcePreviewUrl\(block\.resourceId\)/);
  assert.doesNotMatch(imageEditor, /<img/);
  assert.match(previewRoute, /authorizePublisherAdminApi/);
  assert.match(previewRoute, /disposition: "inline"/);
  assert.doesNotMatch(previewRoute, /published: true/);
});

test("table canvas cells stay directly editable and avoid frame dragging", () => {
  const tableEditor = readFileSync(new URL("../components/admin/books/editor/blocks/TableBlockEditor.tsx", import.meta.url), "utf8");
  const layoutFrame = readFileSync(new URL("../components/admin/books/editor/LayoutObjectFrame.tsx", import.meta.url), "utf8");
  const manuscriptEditor = readFileSync(new URL("../components/admin/books/ContentManuscriptEditor.tsx", import.meta.url), "utf8");
  assert.match(tableEditor, /contentEditable/);
  assert.match(tableEditor, /onKeyDown/);
  assert.match(tableEditor, /event\.key === "Tab"/);
  assert.match(tableEditor, /onPointerDown=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(manuscriptEditor, /showControls=\{selected && propertiesOpen\}/);
  assert.match(layoutFrame, /contenteditable="true"/);

  const document = createContentDocument([{ ...createTableBlock("table", undefined, { rows: 3, columns: 3 }), id: "table-edit" }]);
  const edited = normalizeContentDocument({
    ...document,
    blocks: document.blocks.map((block) => block.type === "table" ? {
      ...block,
      rows: block.rows.map((row, rowIndex) => rowIndex === 0 ? {
        ...row,
        cells: row.cells.map((cell, cellIndex) => cellIndex === 0 ? { ...cell, text: "Name", spans: [{ text: "Name" }] } : cellIndex === 1 ? { ...cell, text: "Class", spans: [{ text: "Class" }] } : { ...cell, text: "Marks", spans: [{ text: "Marks" }] }),
      } : row),
    } : block),
  });
  const reloaded = normalizeContentDocument(serializeContentDocument(edited));
  const table = reloaded.blocks[0];
  assert.equal(table.type, "table");
  if (table.type !== "table") return;
  assert.deepEqual(table.rows[0].cells.slice(0, 3).map((cell) => cell.text), ["Name", "Class", "Marks"]);
});

test("image preview proxies an authorized draft image inline without changing public download rules", () => {
  const previewRoute = readFileSync(new URL("../app/api/admin/resources/[id]/preview/route.ts", import.meta.url), "utf8");
  const downloadPolicy = readFileSync(new URL("../lib/storage/protected-download-policy.ts", import.meta.url), "utf8");
  const editor = readFileSync(new URL("../components/admin/books/ContentManuscriptEditor.tsx", import.meta.url), "utf8");
  assert.match(editor, /contentResourcePreviewUrl\(block\.resourceId\)/);
  assert.match(previewRoute, /ResourceType\.IMAGE/);
  assert.match(previewRoute, /fetch\(signed\.url/);
  assert.match(previewRoute, /new NextResponse\(source\.body/);
  assert.match(previewRoute, /"Content-Type"/);
  assert.match(previewRoute, /"Content-Disposition"/);
  assert.doesNotMatch(previewRoute, /published: true/);
  assert.match(downloadPolicy, /!authorized\.resource\.published/);
});
test("activity fields are all optional and a one-line activity survives save/reload", () => {
  const document = normalizeContentDocument({
    blocks: [{
      id: "activity-one-line",
      type: "activity",
      title: "Magnetic or Not?",
      fields: [{ id: "instructions", type: "instructions", text: "Bring a magnet close to five classroom objects." }],
      layout: { x: 12, y: 20, width: 640, height: 280, zIndex: 3, locked: false },
    }],
  });
  const reloaded = normalizeContentDocument(serializeContentDocument(document));
  const activity = reloaded.blocks[0];

  assert.equal(activity.type, "activity");
  if (activity.type !== "activity") return;
  assert.equal(activity.fields.length, 1);
  assert.equal(activity.fields[0].text, "Bring a magnet close to five classroom objects.");
  assert.equal(activity.fields.some((field) => field.type === "objective"), false);
  assert.equal(activity.fields.some((field) => field.type === "materials"), false);
  assert.equal(activity.layout?.x, 12);
  assert.equal(activity.layout?.width, 640);
});

test("empty activity fields normalize safely and teacher notes default to teacher-only", () => {
  const document = normalizeContentDocument({
    blocks: [{ id: "activity-empty", type: "activity", fields: [{ id: "note", type: "teacherNote" }] }],
  });
  const activity = document.blocks[0];
  assert.equal(activity.type, "activity");
  if (activity.type !== "activity") return;
  assert.equal(activity.fields[0].text, undefined);
  assert.deepEqual(activity.fields[0].visibility, { student: false, teacher: true });
});

test("activity fields can be added, reordered, and removed without changing the object", () => {
  const base = createActivityBlock();
  const document = createContentDocument([{ ...base, id: "activity-ops" }]);
  const withObjective = addActivityField(document, "activity-ops", { id: "objective", type: "objective", text: "Observe carefully." });
  const withMaterials = addActivityField(withObjective, "activity-ops", { id: "materials", type: "materials", text: "Magnet." });
  const moved = moveActivityField(withMaterials, "activity-ops", "materials", -1);
  const movedActivity = moved.blocks[0];
  assert.equal(movedActivity.type, "activity");
  if (movedActivity.type !== "activity") return;
  assert.deepEqual(movedActivity.fields.slice(-2).map((field) => field.type), ["materials", "objective"]);
  const removed = removeActivityField(moved, "activity-ops", "materials");
  const removedActivity = removed.blocks[0];
  assert.equal(removedActivity.type, "activity");
  if (removedActivity.type !== "activity") return;
  assert.equal(removedActivity.fields.some((field) => field.type === "materials"), false);
  assert.equal(removedActivity.layout?.width, base.layout?.width);
});

test("legacy text content normalizes to a continuous rich-text-compatible paragraph", () => {
  const document = normalizeContentDocument({
    version: 2,
    blocks: [{ id: "legacy-paragraph", type: "paragraph", text: "A legacy paragraph" }],
  });

  assert.equal(document.blocks.length, 1);
  assert.equal(document.blocks[0].type, "paragraph");
  assert.deepEqual(document.blocks[0].type === "paragraph" ? document.blocks[0].spans : [], [
    { text: "A legacy paragraph" },
  ]);
  assert.equal(document.canvas.preset, "WEB");
});

test("educational objects normalize unknown variants and preserve layout metadata", () => {
  const document = normalizeContentDocument({
    blocks: [{
      id: "object-1",
      type: "educationalObject",
      objectType: "futureObject",
      title: "Custom title",
      body: "Object body",
      layout: {
        x: 24,
        y: 48,
        width: 520,
        height: 220,
        zIndex: 7,
        locked: true,
        digital: { order: 2, width: "wide", alignment: "center", visibility: "teacher" },
      },
    }],
  });

  const block = document.blocks[0];
  assert.equal(block.type, "educationalObject");
  if (block.type !== "educationalObject") return;
  assert.equal(block.objectType, "didYouKnow");
  assert.equal(block.title, "Custom title");
  assert.equal(block.text, "Object body");
  assert.deepEqual(block.layout, {
    x: 24,
    y: 48,
    width: 520,
    height: 220,
    zIndex: 7,
    locked: true,
    digital: { order: 2, width: "wide", alignment: "center", visibility: "teacher" },
  });
});

test("heading 3 and superscript/subscript marks survive serialization", () => {
  const serialized = serializeContentDocument({
    blocks: [{
      id: "formatted-heading",
      type: "heading3",
      text: "H2O and x2",
      indent: 2,
      lineSpacing: 1.5,
      spans: [
        { text: "H", marks: ["bold"] },
        { text: "2", marks: ["subscript"] },
        { text: "O and x", marks: ["italic"] },
        { text: "2", marks: ["superscript"] },
      ],
    }],
  });
  const document = normalizeContentDocument(serialized);
  const block = document.blocks[0];

  assert.equal(block.type, "heading3");
  if (block.type !== "heading3") return;
  assert.equal(block.indent, 2);
  assert.equal(block.lineSpacing, 1.5);
  assert.deepEqual(block.spans.map((span) => span.marks), [
    ["bold"],
    ["subscript"],
    ["italic"],
    ["superscript"],
  ]);
  assert.equal(block.text, "H2O and x2");
});

test("list item formatting remains part of the canonical document", () => {
  const document = normalizeContentDocument({
    blocks: [{
      id: "list-1",
      type: "bulletList",
      items: ["Bold item", "Sub item"],
      itemSpans: [
        [{ text: "Bold item", marks: ["bold"] }],
        [{ text: "Sub item", marks: ["subscript"] }],
      ],
    }],
  });
  const block = document.blocks[0];

  assert.equal(block.type, "bulletList");
  if (block.type !== "bulletList") return;
  assert.deepEqual(block.itemSpans?.map((spans) => spans[0].marks), [["bold"], ["subscript"]]);
});

test("table dimensions, formatting, layout, widths, and heights survive save/reload", () => {
  const original = {
    blocks: [{
      id: "table-1",
      type: "table",
      layout: { x: 18, y: 32, width: 720, height: 360, zIndex: 4, locked: true },
      headerRows: [0],
      columnWidths: [0.25, 0.5, 0.25],
      tableBorderStyle: "outer",
      rows: [
        { id: "row-1", height: 72, cells: [{ id: "a", text: "Name", header: true, horizontalAlign: "center", verticalAlign: "middle", background: "muted" }, { id: "b", text: "Value", header: true }, { id: "c", text: "Notes", header: true }] },
        { id: "row-2", cells: [{ id: "d", text: "Alpha", spans: [{ text: "Alpha", marks: ["bold"] }] }, { id: "e", text: "42" }, { id: "f", text: "Stable" }] },
      ],
    }],
  };
  const reloaded = normalizeContentDocument(serializeContentDocument(original));
  const table = reloaded.blocks[0];

  assert.equal(table.type, "table");
  if (table.type !== "table") return;
  assert.equal(table.layout?.x, 18);
  assert.equal(table.layout?.y, 32);
  assert.equal(table.layout?.width, 720);
  assert.equal(table.layout?.height, 360);
  assert.equal(table.layout?.zIndex, 4);
  assert.equal(table.layout?.locked, true);
  assert.deepEqual(table.columnWidths, [0.25, 0.5, 0.25]);
  assert.equal(table.rows[0].height, 72);
  assert.deepEqual(table.headerRows, [0]);
  assert.equal(table.rows[0].cells[0].horizontalAlign, "center");
  assert.equal(table.rows[0].cells[0].background, "muted");
  assert.deepEqual(table.rows[1].cells[0].spans?.[0].marks, ["bold"]);
});

test("table row and column operations preserve content while maintaining valid dimensions", () => {
  const table = createTableBlock("table", undefined, { rows: 2, columns: 2 });
  const document = createContentDocument([{ ...table, id: "table-ops" }]);
  const withRow = insertTableRow(document, "table-ops", 0, "below");
  assert.equal((withRow.blocks[0] as typeof table).rows.length, 3);
  const withColumn = insertTableColumn(withRow, "table-ops", 1);
  const columnTable = withColumn.blocks[0] as typeof table;
  assert.equal(columnTable.columnWidths?.length, 3);
  assert.equal(columnTable.rows[0].cells.length, 3);
  const withoutColumn = deleteTableColumn(withColumn, "table-ops", 1);
  assert.equal((withoutColumn.blocks[0] as typeof table).columnWidths?.length, 2);
  const withoutRow = deleteTableRow(withoutColumn, "table-ops", 1);
  assert.equal((withoutRow.blocks[0] as typeof table).rows.length, 2);
});

test("constrained same-row merge and split preserve a stable grid", () => {
  const table = createTableBlock("table", undefined, { rows: 1, columns: 3 });
  const document = createContentDocument([{ ...table, id: "table-merge" }]);
  const merged = mergeTableCells(document, "table-merge", 0, 0, 1);
  const mergedTable = merged.blocks[0];
  assert.equal(mergedTable.type, "table");
  if (mergedTable.type !== "table") return;
  assert.equal(mergedTable.rows[0].cells[0].colSpan, 2);
  assert.equal(mergedTable.rows[0].cells.length, 2);
  const split = splitTableCell(merged, "table-merge", 0, 0);
  const splitTable = split.blocks[0];
  assert.equal(splitTable.type, "table");
  if (splitTable.type !== "table") return;
  assert.equal(splitTable.rows[0].cells.length, 3);
  assert.equal(splitTable.rows[0].cells[0].colSpan, undefined);
});

test("worksheet supports every question type with optional metadata and answers", () => {
  const questions = WORKSHEET_QUESTION_TYPES.map((type) => ({ ...createWorksheetQuestion(type), prompt: `${type} prompt` }));
  const document = normalizeContentDocument({ blocks: [{ id: "worksheet-one", type: "worksheet", title: "Exploring Magnets", questions, layout: { x: 24, y: 36, width: 760, height: 620, zIndex: 8, locked: true } }] });
  const block = document.blocks[0];
  assert.equal(isWorksheetBlock(block), true);
  if (!isWorksheetBlock(block)) return;
  assert.equal(block.questions.length, WORKSHEET_QUESTION_TYPES.length);
  assert.equal(block.title, "Exploring Magnets");
  assert.equal(block.instructions, undefined);
  assert.equal(block.layout?.x, 24);
  assert.equal(block.layout?.locked, true);
  assert.equal(block.questions.find((question) => question.type === "mcq")?.options?.length, 4);
});

test("worksheet question order, duplication, deletion, visibility, and save/reload persist", () => {
  const base = createWorksheetBlock();
  const document = createContentDocument([{ ...base, id: "worksheet-ops", title: "Exploring Magnets", instructions: "Answer carefully.", teacherNote: "Review the long answers.", marks: 10, duration: "30 minutes", layout: { x: 40, y: 50, width: 700, height: 480, zIndex: 5 } }]);
  const withQuestions = addWorksheetQuestion(document, "worksheet-ops", { ...createWorksheetQuestion("short"), prompt: "Name two magnetic materials.", answer: "Iron and steel", marks: 2 });
  const withSecond = addWorksheetQuestion(withQuestions, "worksheet-ops", { ...createWorksheetQuestion("trueFalse"), prompt: "A compass uses magnetism.", visibility: { student: true, teacher: true } });
  const first = withSecond.blocks[0];
  assert.equal(first.type, "worksheet");
  if (first.type !== "worksheet") return;
  const secondId = first.questions[1].id;
  const moved = moveWorksheetQuestion(withSecond, "worksheet-ops", secondId, -1);
  const duplicated = duplicateWorksheetQuestion(moved, "worksheet-ops", secondId);
  const duplicateBlock = duplicated.blocks[0];
  assert.equal(duplicateBlock.type, "worksheet");
  if (duplicateBlock.type !== "worksheet") return;
  assert.equal(duplicateBlock.questions.length, 3);
  assert.notEqual(duplicateBlock.questions[1].id, duplicateBlock.questions[2].id);
  const removed = removeWorksheetQuestion(duplicated, "worksheet-ops", duplicateBlock.questions[1].id);
  const reloaded = normalizeContentDocument(serializeContentDocument(removed));
  const worksheet = reloaded.blocks[0];
  assert.equal(worksheet.type, "worksheet");
  if (worksheet.type !== "worksheet") return;
  assert.deepEqual(worksheet.questions.map((question) => question.type), ["trueFalse", "short"]);
  assert.equal(worksheet.questions[1].answer, "Iron and steel");
  assert.equal(worksheet.teacherNote, "Review the long answers.");
  assert.equal(worksheet.layout?.height, 480);
});

test("worksheet export defaults to student-safe output and uses a sanitized filename", () => {
  const worksheet = normalizeWorksheetBlock({ id: "worksheet-export", type: "worksheet", title: "Science Explorer: Class 6 / Magnets", teacherNote: "Teacher only", questions: [{ id: "q1", type: "short", prompt: "What is a magnet?", answer: "An object that attracts iron." }] });
  assert.equal(worksheetToPlainLines(worksheet).some((line) => line.includes("An object")), false);
  assert.equal(worksheetToPlainLines(worksheet, { includeAnswers: true }).some((line) => line.includes("An object")), true);
  assert.equal(worksheetFilename(worksheet.title ?? "", false), "science-explorer-class-6-magnets.pdf");
  const pdf = createWorksheetPdf(worksheet);
  assert.equal(new TextDecoder().decode(pdf.slice(0, 8)), "%PDF-1.4");
});

test("exercise supports a flat question list with shared question semantics", () => {
  const questions = WORKSHEET_QUESTION_TYPES.map((type) => ({ ...createExerciseQuestion(type), prompt: `${type} prompt` }));
  const document = normalizeContentDocument({ blocks: [{ id: "exercise-flat", type: "exercise", title: "Check Your Understanding", instructions: "Answer the questions.", questions, groups: [], layout: { x: 22, y: 44, width: 700, height: 520, zIndex: 6 } }] });
  const block = document.blocks[0];
  assert.equal(block.type, "exercise");
  if (block.type !== "exercise") return;
  assert.equal(block.questions.length, WORKSHEET_QUESTION_TYPES.length);
  assert.equal(block.groups.length, 0);
  assert.equal(block.layout?.width, 700);
  assert.equal(block.questions.find((question) => question.type === "mcq")?.options?.length, 4);
});

test("exercise groups are optional, reorderable, and remove safely back to ungrouped questions", () => {
  const exercise = createExerciseBlock();
  const firstGroup = createExerciseGroup();
  const secondGroup = createExerciseGroup();
  let block = addExerciseObjectGroup(exercise, firstGroup);
  block = addExerciseObjectGroup(block, secondGroup);
  const firstQuestion = createExerciseQuestion("mcq");
  const secondQuestion = createExerciseQuestion("short");
  block = addExerciseObjectQuestion(block, firstQuestion, firstGroup.id);
  block = addExerciseObjectQuestion(block, secondQuestion, secondGroup.id);
  block = moveExerciseObjectGroup(block, secondGroup.id, -1);
  assert.deepEqual(block.groups.map((group) => group.id), [secondGroup.id, firstGroup.id]);
  block = moveExerciseObjectQuestion(block, "exercise-missing", 1);
  block = duplicateExerciseObjectQuestion(block, firstQuestion.id);
  const duplicatedGroup = block.groups.find((group) => group.id === firstGroup.id);
  assert.equal(duplicatedGroup?.questions.length, 2);
  const duplicateId = duplicatedGroup?.questions[1]?.id;
  assert.ok(duplicateId);
  block = removeExerciseObjectQuestion(block, duplicateId);
  block = removeExerciseObjectGroup(block, firstGroup.id);
  assert.equal(block.groups.length, 1);
  assert.equal(block.questions.length, 1);
  const reloaded = normalizeContentDocument(serializeContentDocument({ blocks: [block] }));
  const exerciseReloaded = reloaded.blocks[0];
  assert.equal(exerciseReloaded.type, "exercise");
  if (exerciseReloaded.type !== "exercise") return;
  assert.equal(exerciseReloaded.groups.length, 1);
  assert.equal(exerciseReloaded.questions.length, 1);
});

test("exercise answers, teacher note, and student-answer default survive normalization", () => {
  const exercise = normalizeExerciseBlock({ id: "exercise-visibility", type: "exercise", teacherNote: "Discuss the HOTS response.", showAnswersToStudent: false, questions: [{ id: "q1", type: "short", prompt: "Explain.", answer: "A model answer", explanation: "A reason", visibility: { student: true, teacher: true } }], groups: [] });
  assert.equal(exercise.showAnswersToStudent, false);
  assert.equal(exercise.teacherNote, "Discuss the HOTS response.");
  assert.equal(exercise.questions[0].answer, "A model answer");
  assert.equal(exercise.questions[0].explanation, "A reason");
});

test("full Module authoring fixture survives normalize, serialize/reload, and canvas changes", () => {
  const table = createTableBlock("table", undefined, { rows: 4, columns: 4 });
  table.id = "table-integration";
  table.headerRows = [0];
  table.columnWidths = [0.2, 0.3, 0.25, 0.25];
  table.rows[0].cells[0].text = "Material";
  table.rows[1].cells[0].text = "Iron";
  table.rows[1].cells[0].background = "highlight";
  table.rows[1].cells[0].horizontalAlign = "center";
  table.rows[1].cells[0].colSpan = 2;
  const activity = { ...createActivityBlock(), id: "activity-integration", title: "Magnet Investigation", fields: [
    { id: "objective", type: "objective" as const, text: "Observe which materials attract a magnet." },
    { id: "materials", type: "materials" as const, text: "Magnet and classroom objects." },
    { id: "instructions", type: "instructions" as const, text: "Test each object carefully." },
    { id: "teacher-note", type: "teacherNote" as const, text: "Ask students to explain their observations.", visibility: { student: false, teacher: true } },
  ] };
  const worksheet = { ...createWorksheetBlock(), id: "worksheet-integration", title: "Practice", questions: [createWorksheetQuestion("mcq"), createWorksheetQuestion("short")] };
  worksheet.questions[0]!.prompt = "Which material is magnetic?";
  worksheet.questions[0]!.answer = "Iron";
  worksheet.questions[1]!.prompt = "Explain a compass.";
  const exercise = { ...createExerciseBlock(), id: "exercise-integration", title: "Check Your Understanding", questions: [{ ...createExerciseQuestion("hots"), prompt: "Why does a compass point north?", marks: 2, answer: "It aligns with Earth's magnetic field." }], groups: [{ id: "group-integration", title: "Choose and Explain", instructions: "Answer in complete sentences.", questions: [{ ...createExerciseQuestion("short"), prompt: "Name two magnetic materials." }] }] };
  const document = normalizeContentDocument({
    blocks: [
      { ...createTextBlock("heading", "Exploring Magnets"), id: "heading-integration", spans: [{ text: "Exploring ", marks: ["bold"] }, { text: "Magnets", marks: ["italic", "underline"] }] },
      { ...createTextBlock("paragraph", "A compass uses Earth's magnetic field."), id: "paragraph-integration", indent: 1, lineSpacing: 1.5 },
      createEducationalObjectBlock("learningOutcome"),
      { ...createImageBlock("image", { url: "/api/resources/resource-image/download", resourceId: "resource-image", alt: "Magnet diagram", crop: { x: 0.1, y: 0.2, width: 0.7, height: 0.6 } }), id: "image-integration" },
      table,
      activity,
      worksheet,
      exercise,
      { ...createMediaBlock({ mediaKind: "video", targetType: "RESOURCE", targetId: "resource-video", label: "Watch Animation", displayMode: "button" }), id: "video-integration" },
    ],
    canvas: { preset: "A4", width: 794, height: 1123, unit: "px", orientation: "portrait", margins: { top: 48, right: 48, bottom: 48, left: 48 } },
  });
  const serialized = serializeContentDocument(document);
  assert.ok(serialized.length < 50000, `integration fixture unexpectedly large: ${serialized.length} bytes`);
  assert.equal(serialized.includes("data:image"), false);
  const reloaded = normalizeContentDocument(serialized);
  assert.equal(reloaded.blocks.length, document.blocks.length);
  const heading = reloaded.blocks.find((block) => block.id === "heading-integration");
  assert.equal(heading?.type, "heading");
  assert.equal(heading?.type === "heading" ? heading.spans[1]?.marks?.includes("underline") : false, true);
  const image = reloaded.blocks.find((block) => block.id === "image-integration");
  assert.equal(image?.type, "image");
  assert.equal(image?.type === "image" ? image.resourceId : undefined, "resource-image");
  assert.equal(image?.type === "image" ? image.crop?.width : undefined, 0.7);
  const reloadedTable = reloaded.blocks.find((block) => block.id === "table-integration");
  assert.equal(reloadedTable?.type, "table");
  assert.equal(reloadedTable?.type === "table" ? reloadedTable.rows.length : 0, 4);
  assert.equal(reloadedTable?.type === "table" ? reloadedTable.rows[1]?.cells[0]?.colSpan : undefined, 2);
  const reloadedActivity = reloaded.blocks.find((block) => block.id === "activity-integration");
  assert.equal(reloadedActivity?.type, "activity");
  assert.equal(reloadedActivity?.type === "activity" ? reloadedActivity.fields[3]?.visibility?.student : undefined, false);
  const reloadedWorksheet = reloaded.blocks.find((block) => block.id === "worksheet-integration");
  assert.equal(reloadedWorksheet?.type, "worksheet");
  assert.equal(reloadedWorksheet?.type === "worksheet" ? reloadedWorksheet.questions[0]?.answer : undefined, "Iron");
  const reloadedExercise = reloaded.blocks.find((block) => block.id === "exercise-integration");
  assert.equal(reloadedExercise?.type, "exercise");
  assert.equal(reloadedExercise?.type === "exercise" ? reloadedExercise.groups[0]?.questions.length : 0, 1);
  const video = reloaded.blocks.find((block) => block.id === "video-integration");
  assert.equal(video?.type, "media");
  assert.equal(video?.type === "media" ? video.targetId : undefined, "resource-video");

  const duplicate = duplicateBlock(reloaded, "exercise-integration");
  const exerciseCopies = duplicate.blocks.filter((block) => block.type === "exercise");
  assert.equal(exerciseCopies.length, 2);
  if (exerciseCopies[0]?.type === "exercise" && exerciseCopies[1]?.type === "exercise") {
    assert.notEqual(exerciseCopies[0].groups[0]?.id, exerciseCopies[1].groups[0]?.id);
    assert.notEqual(exerciseCopies[0].groups[0]?.questions[0]?.id, exerciseCopies[1].groups[0]?.questions[0]?.id);
  }

  for (const preset of ["A4", "A5", "A3", "CUSTOM", "WEB", "STUDENT", "TEACHER"] as const) {
    const switched = normalizeContentDocument({ ...reloaded, canvas: { ...reloaded.canvas, preset } });
    const switchedExercise = switched.blocks.find((block) => block.id === "exercise-integration");
    assert.equal(switched.canvas.preset, preset);
    assert.equal(switchedExercise?.type === "exercise" ? switchedExercise.groups[0]?.questions[0]?.prompt : undefined, "Name two magnetic materials.");
  }
});
