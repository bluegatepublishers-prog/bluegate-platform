export type EditorSaveState = "saved" | "dirty" | "saving" | "error";

export type EditorSaveButtonState = {
  disabled: boolean;
  label: "Save" | "Saving?" | "Saved";
  active: boolean;
};

export function getEditorSaveButtonState(
  saveState: EditorSaveState,
  dirty: boolean,
): EditorSaveButtonState {
  if (saveState === "saving") {
    return { disabled: true, label: "Saving?", active: false };
  }

  const active = dirty || saveState === "error";
  return active
    ? { disabled: false, label: "Save", active: true }
    : { disabled: true, label: "Saved", active: false };
}
