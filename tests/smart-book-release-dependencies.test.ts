import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const release = readFileSync("lib/content-release.ts", "utf8");
const questions = readFileSync("lib/book-questions.ts", "utf8");
const editor = readFileSync("components/admin/books/ContentManuscriptEditor.tsx", "utf8");
const actions = readFileSync("app/admin/books/[id]/content/actions.ts", "utf8");
const workspace = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");

test("published snapshots extract only referenced media, image, frame, and launcher dependencies", () => {
  assert.match(release, /if \(block\.targetType === "RESOURCE"\) addResourceId\(resourceIds, block\.targetId\)/u);
  assert.match(release, /addResourceId\(resourceIds, block\.posterResourceId\)/u);
  assert.match(release, /block\.type === "image" \|\| block\.type === "diagram"/u);
  assert.match(release, /for \(const image of block\.images\) addResourceId\(resourceIds, image\.resourceId\)/u);
  assert.match(release, /page\.background\?\.resourceId/u);
  assert.match(release, /page\.replica\?\.resourceId/u);
  assert.match(release, /page\.narration\?\.segments/u);
  assert.match(release, /addResourceId\(resourceIds, frame\.resourceId\)/u);
  assert.match(release, /addResourceId\(resourceIds, frame\.contentRef\?\.resourceId\)/u);
  assert.match(release, /for \(const child of frame\.children \?\? \[\]\)/u);
});

test("publish promotes only owned, active, current-book dependencies and launcher-selected questions", () => {
  assert.match(release, /resource\.updateMany\(/u);
  assert.match(release, /id: \{ in: \[\.\.\.resourceIds\] \}/u);
  assert.match(release, /publisherId,\s*archived: false,\s*OR: \[\{ bookId \}, \{ bookId: null \}\]/u);
  assert.match(release, /bookExercise\.updateMany\(/u);
  assert.match(release, /bookId,\s*book: \{ publisherId \},\s*archived: false/u);
  assert.match(release, /bookExerciseQuestionGroup\.updateMany\(/u);
  assert.match(release, /data: \{ active: true \}/u);
  assert.match(release, /questionIds\.length \? \{ id: \{ in: launcher\.questionIds \} \}/u);
  assert.match(release, /questionType: launcher\.questionType/u);
  assert.match(release, /data: \{ approved: true \}/u);
  assert.match(release, /exerciseGroup: \{ id: launcher\.groupId, exerciseId: launcher\.exerciseId \}/u);
  assert.match(release, /await publishSnapshotDependencies\(tx, input\.actor\.publisherId, input\.bookId, snapshot, publishPlan!, publishTiming\);/u);
});

test("publish success is not converted into a false failure by post-commit refresh or audit", () =>
{
  assert.match(actions, /function refresh\(bookId: string\) \{[\s\S]*?try \{[\s\S]*?revalidatePath/);
  assert.match(actions, /Content revalidation failed after a successful mutation/);
  assert.match(actions, /Content release audit failed after a successful release/);
  assert.match(actions, /await transitionRelease\([\s\S]*?await recordContentReleaseAudit/);
  assert.match(editor, /publishingRef\.current/);
  assert.match(workspace, /disabled=\{publishing\}/);
});

test("Book Questions and Smart Book uploads remain draft until Smart Book Publish", () => {
  assert.match(questions, /type: CurriculumExerciseType\.PRACTICE,[\s\S]*published: false,/u);
  assert.doesNotMatch(questions, /if \(!exercise\.published\)/u);
  assert.match(editor, /published: false,/u);
  assert.match(editor, /published: payload\.published \?\? false,/u);
});

test("bulk publish inherits the release dependency cascade through transitionRelease", () => {
  const bulkStart = release.indexOf("export async function bulkPublishRelease");
  assert.ok(bulkStart >= 0);
  const bulk = release.slice(bulkStart);
  assert.match(bulk, /await transitionRelease\(/u);
  assert.match(bulk, /action: "PUBLISH"/u);
  assert.match(bulk, /confirm: true/u);
});

test("published snapshots collect question launchers from every V2 page and nested frame", () => {
  const source = readFileSync("lib/content-release.ts", "utf8");

  for (const fragment of [
    "for (const page of snapshot.contentDocument?.pageLayout?.pages ?? [])",
    "for (const frame of page.frames) collectFrameDependencies(frame, resourceIds, exerciseIds, questionLaunchers, launcherKeys)",
    "for (const child of frame.children ?? [])",
    "collectFrameDependencies(child, resourceIds, exerciseIds, questionLaunchers, launcherKeys);",
    "const questionIds = [...new Set((target.questionIds ?? []).map((id) => id.trim()).filter(Boolean))];",
    "questionLaunchers.push({ exerciseId, groupId, questionType: target.questionType, questionIds })",
    "const exerciseIds = new Set(plan.snapshotDependencies.exerciseIds)",
    "id: { in: launcher.questionIds }",
  ]) {
    assert.ok(source.includes(fragment), "Missing cascade fragment: " + fragment);
  }
});


test("Phase 2J-B bounds only the Smart Book Publish transaction", () => {
  const start = release.indexOf("export async function transitionRelease");
  const end = release.indexOf("export async function rollbackRelease", start);
  const transition = release.slice(start, end);
  assert.match(
    transition,
    /const publishTransactionOptions = input\.action === "PUBLISH"\s*\? \{ maxWait: 10_000, timeout: 15_000 \}\s*:\s*undefined/u,
  );
  assert.match(transition, /\}, publishTransactionOptions\);/u);
  assert.doesNotMatch(transition, /isolationLevel:/u);
  assert.doesNotMatch(readFileSync("lib/prisma.ts", "utf8"), /maxWait|timeout/u);
});

test("version creation and the publication cascade stay inside one atomic transaction", () => {
  const transition = smartBookTransitionSource();
  const transactionStart = transition.indexOf("const transactionResult = await prisma.$transaction(async (tx) => {");
  const versionCreate = transition.indexOf("tx.contentReleaseVersion.create(");
  const dependencyPromotion = transition.indexOf("publishSnapshotDependencies(tx");
  const transactionEnd = transition.indexOf("}, publishTransactionOptions);", transactionStart);
  assert.ok(transactionStart >= 0);
  assert.ok(versionCreate > transactionStart && versionCreate < transactionEnd);
  assert.ok(dependencyPromotion > transactionStart && dependencyPromotion < transactionEnd);
  assert.match(release, /tx\.bookChapter\.updateMany\(/u);
  assert.match(release, /tx\.bookModule\.updateMany\(/u);
  assert.match(release, /tx\.bookExercise\.updateMany\(/u);
  assert.match(release, /tx\.bookExerciseQuestionGroup\.updateMany\(/u);
  assert.match(release, /tx\.bookQuestion\.updateMany\(/u);
  assert.match(release, /resource\.updateMany\(/u);
});

test("publication race checks retain ownership and update-count validation", () => {
  assert.match(release, /book: \{ publisherId \},\s*archived: false/u);
  assert.match(release, /result\.count !== dependencies\.chapterIds\.length/u);
  assert.match(release, /result\.count !== dependencies\.moduleIds\.length/u);
  assert.match(release, /result\.count !== plan\.validGroupIds\.length/u);
  assert.match(release, /result\.count !== plan\.validQuestionIds\.length/u);
  assert.match(release, /const currentVersion = release\.currentVersionId[\s\S]*?tx\.contentReleaseVersion\.findUnique/u);
  assert.match(release, /const versionNumber = release\.latestVersionNumber \+ 1/u);
});

test("publish timing is development-only and contains no content or identifiers", () => {
  assert.match(release, /process\.env\.NODE_ENV === "production"/u);
  assert.match(release, /dependency plan ready/u);
  assert.match(release, /transaction start/u);
  assert.match(release, /release version created/u);
  assert.match(release, /hierarchy promotion/u);
  assert.match(release, /resource promotion/u);
  assert.match(release, /transaction committed/u);
  assert.match(release, /console\.info\("\[SmartBookPublishTiming\]", stage/u);
  assert.doesNotMatch(release, /console\.info\([^\n]*(bookId|targetId|snapshot|questionIds)/u);
});

test("Save and Publish remain separate workflows", () => {
  const saveStart = actions.indexOf("export async function saveBookContentAction");
  const publishStart = actions.indexOf("export async function changeContentReleaseAction");
  assert.ok(saveStart >= 0 && publishStart > saveStart);
  const save = actions.slice(saveStart, publishStart);
  const publish = actions.slice(publishStart);
  assert.match(save, /prisma\.book\.updateMany\(/u);
  assert.doesNotMatch(save, /transitionRelease\(/u);
  assert.match(publish, /await transitionRelease\(/u);
  assert.match(publish, /await recordContentReleaseAudit\(/u);
});

function smartBookTransitionSource() {
  const start = release.indexOf("export async function transitionRelease");
  const end = release.indexOf("export async function rollbackRelease", start);
  assert.ok(start >= 0 && end > start);
  return release.slice(start, end);
}
