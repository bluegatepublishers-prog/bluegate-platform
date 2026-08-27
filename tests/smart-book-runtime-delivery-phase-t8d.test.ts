import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildSmartBookContentsFromManifest } from "@/lib/smart-book-contents";
import type { ContentDocument } from "@/lib/content-document";
import {
  resolveManifestActivities,
  resolveManifestLinkedAssets,
  resolveManifestQuestions,
  resolveManifestResourceUrls,
  resolveManifestWorksheets,
} from "@/lib/smart-book-release-projection";
import {
  buildSmartBookReleaseManifest,
  parseSmartBookReleaseManifest,
  type SmartBookManifestBuildSource,
} from "@/lib/smart-book-release-manifest";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relative: string) => readFileSync(root + "/" + relative, "utf8");

function fixture(): SmartBookManifestBuildSource {
  const document = {
    version: 4,
    canvas: { width: 1000, height: 1000 },
    blocks: [
      { id: "safe-text", type: "paragraph", text: "Released A", spans: [{ text: "Released A" }] },
      { id: "question-block", type: "text", payload: { text: "Choose A" } },
    ],
    periods: [],
    layoutVersion: 2,
    pageLayout: {
      pages: [
        { id: "page-a", order: 0, pdfBackground: { source: "BOOK_FULL_PDF", pageNumber: 2 }, background: { resourceId: "resource-a" }, frames: [] },
        { id: "page-b", order: 1, pdfBackground: { source: "BOOK_FULL_PDF", pageNumber: 8 }, frames: [] },
      ],
    },
  } as unknown as ContentDocument;
  return {
    publisherId: "publisher-1",
    bookId: "book-1",
    book: { title: "Released Book", slug: "released-book", subtitle: null, edition: "2026", updatedAt: new Date("2026-08-26T00:00:00.000Z") },
    document,
    hierarchy: [
      { sourceId: "part-a", bookId: "book-1", kind: "PART", parentSourceId: null, partSourceId: "part-a", unitSourceId: null, chapterSourceId: null, moduleSourceId: null, topicSourceId: null, title: "Part A", label: null, number: null, displayOrder: 0, startPage: 1, endPage: 10 },
      { sourceId: "chapter-a", bookId: "book-1", kind: "CHAPTER", parentSourceId: "part-a", partSourceId: "part-a", unitSourceId: null, chapterSourceId: null, moduleSourceId: null, topicSourceId: null, title: "Chapter A", label: "Chapter A", number: 1, displayOrder: 0, startPage: 1, endPage: 10 },
      { sourceId: "module-a", bookId: "book-1", kind: "MODULE", parentSourceId: "chapter-a", partSourceId: null, unitSourceId: null, chapterSourceId: "chapter-a", moduleSourceId: null, topicSourceId: null, title: "Module A", label: null, number: null, displayOrder: 0, startPage: 2, endPage: 8 },
      { sourceId: "module-b", bookId: "book-1", kind: "MODULE", parentSourceId: "chapter-a", partSourceId: null, unitSourceId: null, chapterSourceId: "chapter-a", moduleSourceId: null, topicSourceId: null, title: "Module B", label: null, number: null, displayOrder: 1, startPage: 9, endPage: 10 },
    ],
    pdf: { bookPdfVersionId: "pdf-a", objectKey: "books/book-1/pdf-a/book.pdf", pageCount: 10, activatedAt: "2026-08-26T00:00:00.000Z" },
    assets: {
      resources: [{ sourceId: "resource-a", title: "Resource A", description: "Released resource", type: "PDF", audience: "STUDENT", mimeType: "application/pdf", published: true, storage: { kind: "OBJECT_KEY", value: "resources/a.pdf" } }],
      media: [],
      activities: [{ sourceId: "activity-a", title: "Activity A", activityType: "GROUP", shortDescription: null, objective: "Observe", materials: null, durationMinutes: 10, groupType: null, preparation: null, instructions: "Do this", steps: [], observationPrompts: [], reflectionPrompts: [], expectedLearning: null, assessment: null, safetyNotes: null, studentInstructions: "Try", attachmentResourceIds: ["resource-a"], audience: "BOTH", difficulty: null }],
      worksheets: [{ sourceId: "worksheet-a", title: "Worksheet A", type: "PRACTICE", instructions: "Released instructions", estimatedMinutes: 10, difficulty: null, audience: "BOTH", totalMarks: 2, allowOnlineAttempt: true, allowPrint: true, runtimeExerciseId: null, questionIds: ["question-a"], printableResourceId: "resource-a", supportingResourceIds: [] }],
      assessments: [{ sourceId: "assessment-a", kind: "QUIZ", displayLabel: "Quiz", sourceUpdatedAt: "2026-08-26T00:00:00.000Z", releaseVersionId: null }],
      questions: [{ sourceId: "question-a", questionType: "MCQ", questionText: "Released question A", options: [{ label: "A" }, { label: "B" }], marks: 2, displayOrder: 0, imageResourceId: null }],
    },
  };
}

test("V2 TOC and page ranges remain the published manifest after source mutation", () => {
  const source = fixture();
  const manifest = buildSmartBookReleaseManifest(source);
  source.hierarchy[1]!.title = "Mutated Chapter";
  source.hierarchy[2]!.title = "Mutated Module";
  source.hierarchy[2]!.displayOrder = 99;
  source.document.pageLayout!.pages[0]!.pdfBackground!.pageNumber = 99;

  const toc = buildSmartBookContentsFromManifest(manifest);
  assert.equal(toc[0]?.title, "Part A");
  assert.equal(toc[0]?.children[0]?.title, "Chapter A");
  assert.equal(toc[0]?.children[0]?.children[0]?.title, "Module A");
  assert.equal(manifest.hierarchy.find((node) => node.sourceId === "module-a")?.startPage, 2);
  assert.equal(manifest.contentDocument.pageLayout?.pages[0]?.pdfBackground?.pageNumber, 2);
});

test("V2 safe projections keep presentation while excluding answer-bearing data", () => {
  const manifest = buildSmartBookReleaseManifest(fixture());
  const questions = resolveManifestQuestions(manifest, "STUDENT");
  const assets = resolveManifestLinkedAssets(manifest, manifest.contentDocument, "STUDENT");
  const activities = resolveManifestActivities(manifest, "STUDENT");
  const worksheets = resolveManifestWorksheets(manifest, "STUDENT");
  const urls = resolveManifestResourceUrls(manifest, manifest.contentDocument, "STUDENT");
  const serialized = JSON.stringify({ questions, assets, activities, worksheets });

  assert.equal(questions["question-a"]?.questionText, "Released question A");
  assert.equal(questions["question-a"]?.marks, 2);
  assert.equal(activities["activity-a"]?.activity.instructions, "Do this");
  assert.equal(worksheets["worksheet-a"]?.worksheet.instructions, "Released instructions");
  assert.equal(urls["resource-a"], "/api/student/resources/resource-a/open");
  assert.equal(worksheets["worksheet-a"]?.answerKeyResource, null);
  assert.equal((questions["question-a"] as Record<string, unknown>).correctAnswer, undefined);
  assert.doesNotMatch(JSON.stringify({ questions, assets, activities }), /correctAnswer|correctAnswers|answerKey|expectedAnswer|teacherNotes|gradingNotes|feedback|studentResponse|marksAwarded|attempt|submission/);
});

test("V2 resource routes are derived only from retained manifest resources", () => {
  const manifest = buildSmartBookReleaseManifest(fixture());
  const document = {
    ...manifest.contentDocument,
    pageLayout: {
      ...manifest.contentDocument.pageLayout!,
      pages: [{ ...manifest.contentDocument.pageLayout!.pages[0]!, background: { resourceId: "foreign-resource" } }],
    },
  } as ContentDocument;
  const routes = resolveManifestResourceUrls(manifest, document, "STUDENT");
  assert.equal(routes["foreign-resource"], undefined);
  assert.equal(routes["resource-a"], undefined);
  assert.equal(resolveManifestResourceUrls(manifest, manifest.contentDocument, "STUDENT")["resource-a"], "/api/student/resources/resource-a/open");
  assert.equal(resolveManifestResourceUrls(manifest, manifest.contentDocument, "TEACHER")["resource-a"], "/api/resources/resource-a/play");
});

test("V2 parser rejects malformed and future versions without a legacy interpretation", () => {
  const manifest = buildSmartBookReleaseManifest(fixture());
  assert.throws(() => parseSmartBookReleaseManifest({ ...manifest, schemaVersion: 3 }));
  assert.throws(() => parseSmartBookReleaseManifest({ ...manifest, schemaVersion: 2, contentDocument: null }));
  const runtime = read("lib/smart-book-release-runtime.ts");
  assert.match(runtime, /parseStoredSmartBookReleaseManifest/);
  assert.match(runtime, /return null/);
  assert.doesNotMatch(runtime, /LEGACY_V1|isLegacyBookReleaseSnapshot|SmartBookReleaseDeliveryError/);
});

test("canonical resolver and V2 structured delivery use the current scoped release only", () => {
  const runtime = read("lib/smart-book-release-runtime.ts");
  const delivery = read("lib/content-delivery.ts");
  assert.match(runtime, /publisherId_targetType_targetId/);
  assert.match(runtime, /currentVersionId/);
  assert.match(runtime, /lifecycle: "PUBLISHED"/);
  assert.match(runtime, /publisherId: input.publisherId/);
  assert.match(runtime, /bookId: input.bookId/);
  assert.match(delivery, /buildImmutableSmartBookStructuredContent/);
  assert.doesNotMatch(delivery, /release\?\.mode|releaseMode|LEGACY_V1/);
  assert.match(delivery, /bookPdfVersionId: release.manifest.pdf.bookPdfVersionId/);
});
test("V2 chapter/module delivery does not read live modules for released presentation", () => {
  const delivery = read("lib/content-delivery.ts");
  assert.doesNotMatch(delivery, /bookModule\.findMany|bookChapter\.findMany/);
  assert.match(delivery, /restrictPublishedBookDocumentToModuleRange/);
  assert.match(delivery, /immutableRelease: true/);
});
test("V2 PDF delivery keeps live entitlement and binds the protected route to the manifest PDF", () => {
  const route = read("app/api/books/[bookId]/full-pdf/route.ts");
  assert.match(route, /getBookEntitlementForAuthenticatedUser/);
  assert.match(route, /resolvePublishedSmartBookContent/);
  assert.match(route, /release\.manifest\.pdf\.bookPdfVersionId/);
  assert.match(route, /requestedReleaseVersionId/);
  assert.match(route, /pdfObjectKey/);
  assert.match(route, /objectKey: release\.manifest\.pdf\.objectKey/);
  assert.doesNotMatch(route, /pdfObjectKey = release\.manifest\.pdf\.objectKey/);
});

test("full-book, planner, Teach Mode, and Today’s Learning retain live operational boundaries", () => {
  const student = read("app/student-dashboard/books/[bookId]/page.tsx");
  const teacher = read("lib/teacher-smart-book-runtime.ts");
  const planner = read("lib/teaching-plan.ts");
  const today = read("lib/student-class-subject-workspace.ts");
  assert.match(student, /resolvePublishedSmartBookContent/);
  assert.match(student, /getSmartBookContents\(book\.id, \{ manifest:/);
  assert.match(teacher, /getSmartBookContents\(book\.id, \{ manifest:/);
  assert.match(planner, /loadSmartBookStructuredContent/);
  assert.doesNotMatch(today, /smart-book-release-runtime/);
  assert.match(read("components/content/v2/V2AssessmentLauncherVisual.tsx"), /immutableRelease/);
  assert.match(read("components/content/v2/V2WorksheetLauncherVisual.tsx"), /immutableRelease/);
});
