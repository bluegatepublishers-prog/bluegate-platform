/** Shared authoring-question vocabulary used by floating Worksheet and Exercise objects. */
export {
  WORKSHEET_QUESTION_LABELS,
  WORKSHEET_QUESTION_TYPES,
  createWorksheetQuestion,
  createWorksheetPair,
  createWorksheetSubQuestion,
  defaultAssertionOptions,
  isWorksheetQuestionType,
  normalizeWorksheetQuestion,
  type WorksheetOption as AuthoringOption,
  type WorksheetPair as AuthoringPair,
  type WorksheetQuestion as AuthoringQuestion,
  type WorksheetQuestionType as AuthoringQuestionType,
  type WorksheetSubQuestion as AuthoringSubQuestion,
  type WorksheetVisibility as AuthoringVisibility,
} from "@/lib/worksheet-object";
