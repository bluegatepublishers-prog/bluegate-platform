import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const release = readFileSync("lib/content-release.ts", "utf8");
const questions = readFileSync("lib/book-questions.ts", "utf8");
const editor = readFileSync("components/admin/books/ContentManuscriptEditor.tsx", "utf8");

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
  assert.match(release, /exerciseGroup: \{\s*id: group\.id,\s*exerciseId: launcher\.exerciseId,\s*active: true/u);
  assert.match(release, /await publishSnapshotDependencies\(tx, input\.actor\.publisherId, input\.bookId, snapshot\);/u);
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
