import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { adaptBookQuestion } from "../lib/normalized-question";
import { createPublisherWorksheetPdf } from "../lib/worksheet-export";

const root = process.cwd();
const manager = readFileSync(path.join(root, "components/admin/books/WorksheetQuestionManager.tsx"), "utf8");
const itemService = readFileSync(path.join(root, "lib/publisher-worksheet-items.ts"), "utf8");
const questionService = readFileSync(path.join(root, "lib/publisher-question-bank.ts"), "utf8");
const studio = readFileSync(path.join(root, "components/admin/books/WorksheetStudio.tsx"), "utf8");
const launchCard = readFileSync(path.join(root, "components/admin/books/WorksheetLaunchCard.tsx"), "utf8");
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const releaseService = readFileSync(path.join(root, "lib/content-release.ts"), "utf8");
const pdfRoute = readFileSync(path.join(root, "app/api/admin/worksheets/[worksheetId]/pdf/route.ts"), "utf8");

test("publisher worksheet PDF is a student-safe printable worksheet", () => {
  const question = adaptBookQuestion({
    id: "q-pdf",
    bookId: "book-pdf",
    chapterId: "chapter-pdf",
    questionType: "MCQ",
    questionText: "Which state of matter fills its container?",
    options: [{ id: "solid", text: "Solid" }, { id: "gas", text: "Gas" }],
    correctAnswer: "gas",
    explanation: "Teacher-only explanation: gases expand.",
    marks: 2,
    difficulty: "EASY",
  });
  const output = new TextDecoder().decode(createPublisherWorksheetPdf({
    title: "States of Matter",
    instructions: "Choose the best answer.",
    bookTitle: "Science 6",
    chapterTitle: "Matter",
    questions: [question],
  }));
  assert.match(output, /^%PDF-1\.4/u);
  assert.match(output, /BLUEGATE WORKSHEET/u);
  assert.match(output, /Name ____________________/u);
  assert.match(output, /Which state of matter fills its container\?/u);
  assert.match(output, /A\. Solid/u);
  assert.match(output, /B\. Gas/u);
  assert.doesNotMatch(output, /Correct answer:/u);
  assert.doesNotMatch(output, /Teacher-only explanation/u);
});

test("worksheet membership is publisher-scoped, approval-gated, and deterministically ordered", () => {
  assert.match(itemService, /worksheet: \{ publisherId: input\.publisherId, bookId: input\.bookId, archivedAt: null \}/u);
  assert.match(itemService, /book: \{ publisherId: input\.publisherId \}, approved: true, archived: false/u);
  assert.match(itemService, /orderBy: \[\{ position: "asc" \}, \{ id: "asc" \}\]/u);
  assert.match(itemService, /position: \(last\._max\.position \?\? -1\) \+ index \+ 1/u);
  assert.match(itemService, /rows\[index \+ input\.direction\]/u);
  assert.match(itemService, /deleteMany/u);
  assert.doesNotMatch(itemService, /bookQuestion\.delete/u);
});

test("publisher authoring reloads persisted items and reuses the shared preview renderers", () => {
  assert.match(manager, /\/api\/admin\/worksheets\/\$\{worksheetId\}\/items/u);
  assert.match(manager, /method: "POST"/u);
  assert.match(manager, /method: "PATCH"/u);
  assert.match(manager, /method: "DELETE"/u);
  assert.match(manager, /await loadItems\(\)/u);
  assert.match(manager, /InteractiveQuestionRenderer/u);
  assert.match(manager, /PrintQuestionRenderer/u);
  assert.match(manager, /audience=\{mode === "PRINT" \? "STUDENT" : "PUBLISHER"\}/u);
  assert.match(manager, /Already added/u);
  assert.match(manager, /No approved questions match these filters/u);
});

test("release snapshots retain the ordered full question records and PDF downloads require publisher authorization", () => {
  assert.match(releaseService, /include: \{ items: \{ orderBy: \[\{ position: "asc" \}, \{ id: "asc" \}\], include: \{ question: true \} \} \}/u);
  assert.match(releaseService, /_count: \{ select: \{ items: true \} \}/u);
  assert.match(releaseService, /WORKSHEET_BACKING_REQUIRED/u);
  assert.match(releaseService, /WORKSHEET_TITLE_REQUIRED/u);
  assert.match(releaseService, /WORKSHEET_QUESTION_INVALID/u);
  assert.match(releaseService, /!item\.question\.approved \|\| item\.question\.archived/u);
  assert.match(pdfRoute, /authorizePublisherAdminApi/u);
  assert.match(pdfRoute, /preferPublished: true/u);
  assert.match(pdfRoute, /Content-Type": "application\/pdf/u);
});

test("Add Questions resets to the real unfiltered approved picker query", () => {
  assert.match(manager, /const emptyFilters: Filters = \{ search: "", chapterId: "", moduleId: "", questionType: "", difficulty: "", tags: "" \}/u);
  assert.match(manager, /function openPicker\(\) \{\s+setFilters\(emptyFilters\);\s+setSelectedIds\(\[\]\);\s+setCandidates\(\[\]\);\s+setFeedback\(null\);\s+setPickerOpen\(true\);\s+\}/u);
  assert.match(manager, /onClick=\{openPicker\}/u);
  assert.match(manager, /new URLSearchParams\(\{ bookId, status: "APPROVED", pageSize: "100" \}\)/u);
  assert.match(manager, /for \(const \[key, value\] of Object\.entries\(filters\)\) if \(value\.trim\(\)\) params\.set\(key, value\.trim\(\)\)/u);
  assert.match(manager, /\/api\/admin\/questions\?\$\{params\}/u);
  assert.match(manager, /No approved questions match these filters/u);
});

test("the service query includes both BookExercise-linked and standalone approved questions", () => {
  const query = questionService.slice(questionService.indexOf("export async function listPublisherQuestions"), questionService.indexOf("  const currentPage = page(input.page, 1);"));
  assert.match(query, /\.\.\.publisherQuestionOwnershipWhere\(publisherId\)/u);
  assert.match(query, /bookId: input\.bookId\.trim\(\)/u);
  assert.match(query, /chapterId: input\.chapterId\.trim\(\)/u);
  assert.match(query, /statusFilter === "APPROVED" \? \{ archived: false, approved: true \}/u);
  assert.doesNotMatch(query, /exerciseId/u, "exercise-linked BookQuestions must not be excluded");
});

test("worksheet candidates keep approved BookExercise-linked and standalone questions available", () => {
  assert.match(questionService, /exerciseId: true/u);
  assert.match(questionService, /question: \{ exerciseId: question\.exerciseId, questionType:/u);
  assert.match(itemService, /bookId: input\.bookId, book: \{ publisherId: input\.publisherId \}, approved: true, archived: false/u);
  assert.doesNotMatch(itemService, /exerciseId: null/u);
  assert.doesNotMatch(itemService, /bookQuestion\.update/u);
  assert.match(manager, /Source: \{candidate\.question\.exerciseId \? "Chapter Exercise" : "Question Bank"\}/u);
  assert.match(manager, /formatPublisherChapterLabel\(candidate\.context\.chapter\.chapterNumber, candidate\.context\.chapter\.title\)/u);
  assert.match(manager, /Already added/u);
  assert.match(manager, /const totalMarks = items\.reduce/u);
  assert.match(manager, /Questions: \{items\.length\} \| Total Marks: \{totalMarks\}/u);
  assert.match(schema, /model PublisherWorksheetItem \{[\s\S]*?worksheetId\s+String[\s\S]*?questionId\s+String[\s\S]*?@@unique\(\[worksheetId, questionId\]\)/u);
});

test("worksheet launch preview is an authoring-only student-card approximation", () => {
  assert.match(launchCard, /label = "Practice Worksheet"/u);
  assert.match(launchCard, /buttonLabel = "Open Worksheet"/u);
  assert.match(launchCard, /questionCount/u);
  assert.match(launchCard, /totalMarks/u);
  assert.match(launchCard, /<h3[^>]*>\{title\}<\/h3>/u);
  assert.match(launchCard, /<p[^>]*>\{context\}<\/p>/u);
  assert.match(manager, /Student button preview/u);
  assert.match(manager, /<WorksheetLaunchCard title=\{worksheetTitle\} context=\{chapterTitle \?\? "Chapter"\} questionCount=\{items\.length\} totalMarks=\{totalMarks\}/u);
  assert.match(manager, /onOpen=\{\(\) => \{ setLaunchPreviewOpen\(false\); setPreviewOpen\(true\); \}\}/u);
  assert.doesNotMatch(manager, /StudentPracticeAttempt/u);
});

test("Worksheet Studio keeps the normal publisher workflow focused", () => {
  assert.match(studio, /<ArrowLeft className="h-4 w-4" \/>/u);
  assert.match(studio, /content\/assignments\/worksheets\?chapterId=/u);
  assert.match(studio, /<h2 className="text-sm font-bold text-slate-950">Questions<\/h2>/u);
  assert.match(studio, /action=\{save\}/u);
  assert.match(studio, /<WorksheetQuestionManager/u);
  assert.match(studio, /transitionReleaseAction\(worksheetId, "PUBLISH", confirmation\)/u);
  assert.doesNotMatch(studio, /StudioWorkspaceShell|Worksheet Inspector|Worksheet Outline|Advanced settings|ContentReleasePanel/u);
});
