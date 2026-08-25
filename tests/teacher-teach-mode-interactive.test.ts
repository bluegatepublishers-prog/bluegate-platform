import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

const normalRoute = read("app/teacher-dashboard/books/[bookId]/page.tsx");
const teachRoute = read("app/teacher-dashboard/classes/[sectionId]/teach/page.tsx");
const runtime = read("lib/teacher-smart-book-runtime.ts");
const reader = read("components/books/SmartBookReader.tsx");
const viewer = read("components/books/SmartBookViewer.tsx");
const renderer = read("components/content/V2ContentDocumentRenderer.tsx");
const frameContent = read("components/content/v2/V2FrameContent.tsx");
const educational = read("components/content/v2/V2EducationalButtonVisual.tsx");
const assessment = read("components/content/v2/V2AssessmentLauncherVisual.tsx");
const teacherPreviewRoute = read("app/api/teacher/book-questions/preview/route.ts");
const assessmentOverlay = read("components/content/v2/V2AssessmentLauncherOverlay.tsx");
const educationalOverlay = read("components/content/v2/V2EducationalOverlay.tsx");
const video = read("components/content/v2/V2VideoVisual.tsx");
const worksheet = read("components/content/v2/V2WorksheetLauncherOverlay.tsx");
const shell = read("components/teacher/TeachModeShell.tsx");
const portalContext = read("components/content/v2/V2OverlayPortalContext.tsx");

test("Teach Mode and normal teacher books share the published interactive runtime payload", () => {
  assert.match(normalRoute, /loadTeacherSmartBookRuntime/);
  assert.match(teachRoute, /loadTeacherSmartBookRuntime/);
  assert.match(runtime, /loadSmartBookStructuredContent/);
  assert.match(runtime, /mode: "TEACHER"/);
  for (const prop of ["document", "linkedAssets", "activities", "worksheets", "media", "sections", "knowledgeDefinitions", "resourceUrls"]) {
    assert.match(teachRoute, new RegExp(prop));
  }
});

test("Teach Mode keeps the active PDF page synchronized with V2 overlays", () => {
  assert.match(reader, /renderPageOverlay/);
  assert.match(reader, /overlayOnly/);
  assert.match(viewer, /renderPageOverlay\?\.\(/);
  assert.match(renderer, /layout\.pages\.filter/);
  assert.match(renderer, /page\.pdfBackground/);
});

test("fullscreen overlays use an in-shell portal target and remain above the book", () => {
  assert.match(portalContext, /V2OverlayPortalTargetContext/);
  assert.match(portalContext, /document\.body/);
  assert.match(shell, /data-teach-overlay-root/);
  assert.match(shell, /V2OverlayPortalProvider/);
  assert.match(shell, /z-\[230\]/);
  for (const source of [educationalOverlay, video, assessmentOverlay, worksheet]) {
    assert.match(source, /useV2OverlayPortalTarget/);
    assert.match(source, /portalTarget/);
  }
  assert.match(educationalOverlay, /z-\[130\]/);
  assert.match(video, /z-\[130\]/);
});

test("Teach Mode uses delivery launchers for video, questions, and educational blocks", () => {
  assert.match(frameContent, /videoPresentation ===[\s\S]*"DELIVERY"/);
  assert.match(frameContent, /ASSESSMENT_LAUNCHER/);
  assert.match(frameContent, /V2EducationalButtonVisual/);
  assert.match(educational, /<V2EducationalOverlay/);
  assert.match(assessment, /V2AssessmentLauncherOverlay/);
});

test("Teach Mode Book Question launchers preserve click, type, scope, and teacher preview authorization", () => {
  assert.match(assessment, /onPointerDown/);
  assert.match(assessment, /setOpen\(true\)/);
  assert.match(assessment, /exerciseId=\{payload\.target\.exerciseId\}/);
  assert.match(assessment, /groupId=\{payload\.target\.groupId\}/);
  assert.match(assessment, /questionType=\{payload\.target\.questionType\}/);
  assert.match(assessment, /questionIds=\{payload\.target\.questionIds\}/);
  assert.match(teacherPreviewRoute, /getTeacherBook/);
  assert.match(teacherPreviewRoute, /requestedQuestionIds/);
  assert.match(teacherPreviewRoute, /normalizeV2PracticeQuestionType/);
  assert.match(teacherPreviewRoute, /approved/);
  assert.match(teacherPreviewRoute, /archived/);
  assert.match(assessmentOverlay, /api\/teacher\/book-questions\/preview/);
});
test("Teach Mode has no temporary Book Question diagnostics", () => {
  assert.doesNotMatch(assessment, /QUESTION DEBUG|data-v2-question-debug|debugEnabled|reportDebug/);
  assert.doesNotMatch(assessmentOverlay, /V2QuestionLauncherDebug|onDebug|apiRequest:|responseParsed:|dialogMounted:/);
});
test("Teacher Book Question preview uses one authorized endpoint with safe failure and retry reporting", () => {
  assert.match(assessmentOverlay, /const previewEndpoint/);
  assert.match(assessmentOverlay, /"\/api\/teacher\/book-questions\/preview"/);
  assert.match(assessmentOverlay, /encodeURIComponent\(\s*exerciseId/);
  assert.match(assessmentOverlay, /encodeURIComponent\(\s*groupId/);
  assert.match(assessmentOverlay, /encodeURIComponent\(questionType\)/);
  assert.match(assessmentOverlay, /encodeURIComponent\(selectedIds\.join\(\",\"\)\)/);
  assert.match(assessmentOverlay, /Questions could not be loaded\./);
  assert.match(assessmentOverlay, />\s*Retry\s*</);
  assert.match(assessmentOverlay, /setLoadFailed\(true\)/);
  assert.match(teacherPreviewRoute, /getTeacherBook/);
  assert.match(teacherPreviewRoute, /canLaunchBookQuestionPractice/);

  assert.equal(
    (assessmentOverlay.match(/\/api\/teacher\/book-questions\/preview/g) ?? []).length,
    1,
  );
  assert.match(assessment, /questionType=\{payload\.target\.questionType\}/);
});
test("Teach tab launch card is top-aligned, scroll-safe, and has one action", () => {
  assert.match(shell, /<main className="p-4 sm:p-6">/);
  assert.match(shell, /Ready to teach/);
  assert.match(shell, /Enter Teaching Mode/);
  assert.doesNotMatch(shell, /Back to Class/);
  assert.doesNotMatch(shell, /items-end/);
  assert.doesNotMatch(shell, /justify-end/);
  assert.doesNotMatch(shell, /min-h-\[100dvh\].*place-items-center/);
  assert.doesNotMatch(shell, /overflow-y-hidden/);
});

test("Teach Mode preserves fullscreen lifecycle and class-context exit", () => {
  assert.match(shell, /requestFullscreen\(\)/);
  assert.match(shell, /fullscreenchange/);
  assert.match(shell, /document\.exitFullscreen/);
  assert.match(shell, /Exit Teaching Mode/);
  assert.match(teachRoute, /showBackLink=\{false\}/);
  assert.match(teachRoute, /backHref/);
});
