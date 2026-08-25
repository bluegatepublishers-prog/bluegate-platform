import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getEditorSaveButtonState } from "../lib/editor-save-state";

const editor = readFileSync("components/admin/books/ContentManuscriptEditor.tsx", "utf8");
const workspace = readFileSync("components/admin/books/editor/V2DocumentWorkspace.tsx", "utf8");

test("clean editor exposes an inactive Saved button", () => {
  assert.deepEqual(getEditorSaveButtonState("saved", false), {
    disabled: true,
    label: "Saved",
    active: false,
  });
});

test("a real edit exposes an active Save button", () => {
  assert.deepEqual(getEditorSaveButtonState("dirty", true), {
    disabled: false,
    label: "Save",
    active: true,
  });
});

test("saving exposes a disabled Saving button and blocks duplicate requests", () => {
  assert.deepEqual(getEditorSaveButtonState("saving", true), {
    disabled: true,
    label: "Saving?",
    active: false,
  });
  assert.match(editor, /if \(savingRef\.current\) return/u);
  assert.match(workspace, /disabled=\{saveButtonState\.disabled\}/u);
});

test("successful save returns the editor to clean Saved state", () => {
  assert.deepEqual(getEditorSaveButtonState("saved", false), {
    disabled: true,
    label: "Saved",
    active: false,
  });
  assert.match(editor, /setBaselineSnapshot\(current\);[\s\S]*?setSaveState\("saved"\)/u);
});

test("save failure re-enables Save while preserving the error path", () => {
  assert.deepEqual(getEditorSaveButtonState("error", true), {
    disabled: false,
    label: "Save",
    active: true,
  });
  assert.match(editor, /setSaveState\("error"\);[\s\S]*?setSaveMessage\("Save failed"\)/u);
});

test("a new edit after saving becomes dirty again", () => {
  assert.deepEqual(getEditorSaveButtonState("dirty", true), {
    disabled: false,
    label: "Save",
    active: true,
  });
  assert.match(editor, /setSaveState\("dirty"\)/u);
  assert.match(editor, /const dirty = snapshot !== baselineSnapshot/u);
});

test("successful Publish still saves first and does not falsely dirty the editor", () => {
  assert.match(editor, /if \(!\(await saveDocument\(\)\)\) return;/u);
  assert.match(editor, /await transitionReleaseAction\("PUBLISH", form\)/u);
  assert.match(editor, /setPublishMessage\("Published successfully\."\)/u);
  const publishStart = editor.indexOf("function publishCurrentNode");
  const publishEnd = editor.indexOf("function focusSearchResult", publishStart);
  const publishSource = editor.slice(publishStart, publishEnd);
  assert.doesNotMatch(publishSource, /setSaveState\("dirty"\)/u);
});

test("the existing Publish action remains available", () => {
  assert.match(workspace, /onClick=\{onPublish\}/u);
  assert.match(workspace, /disabled=\{publishing\}/u);
});

test("Undo and Redo remain wired to the existing document history", () => {
  assert.match(workspace, /onClick=\{onUndo\}/u);
  assert.match(workspace, /onClick=\{onRedo\}/u);
  assert.match(editor, /function undoDocument\(\)/u);
  assert.match(editor, /function redoDocument\(\)/u);
});
