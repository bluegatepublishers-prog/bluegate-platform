export type AssignmentActionResult<T = undefined> =
  | ({ ok: true; message: string } & (T extends undefined ? object : { data: T }))
  | { ok: false; message: string };

export const SAFE_ASSIGNMENT_UNAVAILABLE = "This assignment is not available.";
export const SAFE_ASSIGNMENT_SAVE_ERROR = "The assignment could not be saved.";
export const SAFE_SUBMISSION_SAVE_ERROR = "Your work could not be saved.";

