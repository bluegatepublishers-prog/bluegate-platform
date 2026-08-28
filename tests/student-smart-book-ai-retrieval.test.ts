import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Student AI retrieval delegates authorization and release selection to content delivery", async () => {
  const adapter = await read("lib/ai/student-smart-book-retrieval.ts");

  assert.match(
    adapter,
    /loadStudentChapterStructuredContent/,
  );

  assert.match(
    adapter,
    /const structured = await loadStudentChapterStructuredContent\([\s\S]*sectionSubjectId,[\s\S]*chapterId,[\s\S]*moduleId,[\s\S]*\)/,
  );

  assert.doesNotMatch(
    adapter,
    /prisma\./,
  );

  assert.doesNotMatch(
    adapter,
    /getStudentChapterWorkspace\(/,
  );
});

test("Student content delivery exposes the already resolved immutable release identity", async () => {
  const delivery = await read("lib/content-delivery.ts");

  const studentLoaderStart = delivery.indexOf(
    "export async function loadStudentChapterStructuredContent",
  );

  const teacherLoaderStart = delivery.indexOf(
    "export async function loadTeacherChapterStructuredContent",
  );

  assert.ok(studentLoaderStart >= 0);
  assert.ok(teacherLoaderStart > studentLoaderStart);

  const studentLoader = delivery.slice(
    studentLoaderStart,
    teacherLoaderStart,
  );

  assert.match(
    studentLoader,
    /const release = await resolvePublishedSmartBookContent/,
  );

  assert.match(
    studentLoader,
    /release:\s*\{\s*releaseId:\s*release\.releaseId,\s*releaseVersionId:\s*release\.releaseVersionId,\s*versionNumber:\s*release\.versionNumber,/,
  );
});

test("Student AI grounding is extracted only from immutable release-derived item documents", async () => {
  const adapter = await read("lib/ai/student-smart-book-retrieval.ts");

  const immutableGuard = adapter.indexOf(
    "if (!item.immutableRelease)",
  );

  const extraction = adapter.indexOf(
    "extractSmartBookAiDocument",
    adapter.indexOf("for (const item of structured.items)"),
  );

  assert.ok(immutableGuard >= 0);
  assert.ok(extraction > immutableGuard);

  const extractionSection = adapter.slice(
    immutableGuard,
    adapter.indexOf("if (!chunks.length)", immutableGuard),
  );

  assert.match(
    extractionSection,
    /extractSmartBookAiDocument\(\s*item\.document,\s*"STUDENT",?\s*\)/,
  );
});

test("Student AI adapter does not use mutable chapter educational fields as grounding", async () => {
  const adapter = await read("lib/ai/student-smart-book-retrieval.ts");

  assert.doesNotMatch(adapter, /\.summary\b/);
  assert.doesNotMatch(adapter, /\.reviewedText\b/);
  assert.doesNotMatch(adapter, /\.keywords\b/);
  assert.doesNotMatch(adapter, /\.activities\b/);
  assert.doesNotMatch(adapter, /\.questions\b/);
  assert.doesNotMatch(adapter, /\.exercises\b/);
  assert.doesNotMatch(adapter, /\.resources\b/);

  assert.match(
    adapter,
    /const chapterTitle = structured\.workspace\.chapter\.title/,
  );
});

test("shared immutable grounding contract requires exact release provenance", async () => {
  const types = await read("lib/ai/types.ts");

  const citationMarker =
    "export type StudentImmutableGroundingCitation = {";

  const groundingMarker =
    "export type StudentImmutableGrounding = {";

  const citationStart = types.indexOf(citationMarker);
  const groundingStart = types.indexOf(groundingMarker);

  assert.ok(citationStart >= 0);
  assert.ok(groundingStart > citationStart);

  const citationType = types.slice(
    citationStart,
    groundingStart,
  );

  assert.match(
    citationType,
    /sourceType:\s*"SMART_BOOK_RELEASE"/,
  );

  assert.match(
    citationType,
    /releaseVersionId:\s*string/,
  );

  assert.match(
    citationType,
    /bookId:\s*string/,
  );

  assert.match(
    citationType,
    /chapterId:\s*string/,
  );

  assert.match(
    citationType,
    /blockId:\s*string/,
  );

  const groundingType = types.slice(groundingStart);

  assert.match(
    groundingType,
    /audience:\s*"STUDENT"/,
  );

  assert.match(
    groundingType,
    /releaseId:\s*string/,
  );

  assert.match(
    groundingType,
    /releaseVersionId:\s*string/,
  );

  assert.match(
    groundingType,
    /versionNumber:\s*number/,
  );

  assert.match(
    groundingType,
    /sectionSubjectId:\s*string/,
  );
});

test("every Student AI grounding citation is populated from the exact resolved release version", async () => {
  const adapter = await read("lib/ai/student-smart-book-retrieval.ts");

  assert.match(
    adapter,
    /const citation:\s*StudentImmutableGroundingCitation\s*=/,
  );

  assert.match(
    adapter,
    /releaseVersionId:\s*structured\.release\.releaseVersionId/,
  );

  assert.match(
    adapter,
    /id:\s*`\$\{structured\.release\.releaseVersionId\}:\$\{item\.id\}:\$\{chunk\.id\}`/,
  );

  assert.match(
    adapter,
    /releaseId:\s*structured\.release\.releaseId/,
  );

  assert.match(
    adapter,
    /versionNumber:\s*structured\.release\.versionNumber/,
  );
});

test("Student AI grounding remains explicitly STUDENT audience", async () => {
  const adapter = await read("lib/ai/student-smart-book-retrieval.ts");

  assert.match(
    adapter,
    /audience:\s*"STUDENT"/,
  );

  assert.match(
    adapter,
    /extractSmartBookAiDocument\([\s\S]*item\.document,[\s\S]*"STUDENT"/,
  );

  assert.doesNotMatch(
    adapter,
    /extractSmartBookAiDocument\([\s\S]*item\.document,[\s\S]*"TEACHER"/,
  );
});

test("Student AI grounding does not perform a second release lookup", async () => {
  const adapter = await read("lib/ai/student-smart-book-retrieval.ts");

  assert.doesNotMatch(
    adapter,
    /resolvePublishedSmartBookContent/,
  );

  assert.doesNotMatch(
    adapter,
    /resolveSmartBookContentReleaseVersion/,
  );

  assert.doesNotMatch(
    adapter,
    /contentReleaseVersion\./,
  );
});

test("Student citation display labels avoid exposing raw internal release identifiers", async () => {
  const adapter = await read("lib/ai/student-smart-book-retrieval.ts");

  const labelFunction = adapter.slice(
    adapter.indexOf("function buildStudentSourceLabel"),
  );

  assert.match(
    labelFunction,
    /chapterTitle/,
  );

  assert.match(
    labelFunction,
    /moduleTitle/,
  );

  assert.doesNotMatch(
    labelFunction,
    /releaseVersionId|releaseId|bookId|blockId/,
  );

  assert.match(
    labelFunction,
    /Released Smart Book/,
  );
});

test("immutable Student prompt sends educational text but not internal release identifiers to provider", async () => {
  const promptBuilder = await read("lib/ai/prompt-builder.ts");

  const start = promptBuilder.indexOf(
    "export function buildImmutableStudentLearningPrompt",
  );

  assert.ok(start >= 0);

  const immutablePrompt = promptBuilder.slice(start);

  assert.match(
    immutablePrompt,
    /IMMUTABLE_RELEASED_SMART_BOOK_GROUNDING_JSON/,
  );

  assert.match(
    immutablePrompt,
    /input\.grounding\.chunks\.map/,
  );

  assert.match(
    immutablePrompt,
    /text:\s*chunk\.text/,
  );

  assert.match(
    immutablePrompt,
    /label:\s*chunk\.citation\.label/,
  );

  const providerGroundingStart = immutablePrompt.indexOf(
    "const providerGrounding",
  );

  const userPromptStart = immutablePrompt.indexOf(
    "const userPrompt",
  );

  assert.ok(providerGroundingStart >= 0);
  assert.ok(userPromptStart > providerGroundingStart);

  const providerGrounding = immutablePrompt.slice(
    providerGroundingStart,
    userPromptStart,
  );

  assert.doesNotMatch(
    providerGrounding,
    /releaseVersionId|releaseId|blockId|bookId|chapterId|sectionSubjectId/,
  );
});
