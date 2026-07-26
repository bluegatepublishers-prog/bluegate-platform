import {
  ClassroomAssignmentStatus,
  ClassroomAssignmentType,
} from "@prisma/client";
import { z } from "zod";

export const ASSIGNMENT_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

const optionalId = z.string().trim().max(100).transform((value) => value || null);
const requiredId = z.string().trim().min(1, "Choose one of your assigned subjects.").max(100);
const optionalDate = z.string().trim().max(80).transform((value, context) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(+parsed)) {
    context.addIssue({ code: "custom", message: "Enter a valid date and time." });
    return z.NEVER;
  }
  return parsed;
});

export const assignmentInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  instructions: z.string().trim().max(10_000).transform((value) => value || null),
  assignmentType: z.enum(ClassroomAssignmentType),
  intent: z.enum([
    ClassroomAssignmentStatus.DRAFT,
    ClassroomAssignmentStatus.PUBLISHED,
    ClassroomAssignmentStatus.SCHEDULED,
  ]),
  sectionSubjectId: requiredId,
  bookId: optionalId,
  chapterId: optionalId,
  totalMarks: z.union([z.literal(""), z.coerce.number().int().min(1).max(10_000)]).transform((value) => value === "" ? null : value),
  allowTextSubmission: z.boolean(),
  allowFileSubmission: z.boolean(),
  allowMultipleFiles: z.boolean(),
  maximumFiles: z.coerce.number().int().min(1).max(10),
  maximumFileSizeMb: z.coerce.number().int().min(1).max(25),
  acceptedFileTypes: z.array(z.enum(ASSIGNMENT_FILE_TYPES)).max(ASSIGNMENT_FILE_TYPES.length),
  allowLateSubmission: z.boolean(),
  allowResubmission: z.boolean(),
  maximumAttempts: z.coerce.number().int().min(1).max(10),
  publishAt: optionalDate,
  dueAt: optionalDate,
  closeAt: optionalDate,
}).superRefine((value, context) => {
  if (!value.allowTextSubmission && !value.allowFileSubmission) {
    context.addIssue({ code: "custom", path: ["allowTextSubmission"], message: "Allow text or file submission." });
  }
  if (value.allowFileSubmission && value.acceptedFileTypes.length === 0) {
    context.addIssue({ code: "custom", path: ["acceptedFileTypes"], message: "Choose at least one accepted file type." });
  }
  if (value.intent === "SCHEDULED" && !value.publishAt) {
    context.addIssue({ code: "custom", path: ["publishAt"], message: "Choose a publishing time." });
  }
  if (value.publishAt && value.dueAt && value.dueAt <= value.publishAt) {
    context.addIssue({ code: "custom", path: ["dueAt"], message: "The due date must be after publishing." });
  }
  if (value.dueAt && value.closeAt && value.closeAt < value.dueAt) {
    context.addIssue({ code: "custom", path: ["closeAt"], message: "The close date cannot be before the due date." });
  }
});

export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

function checked(form: FormData, key: string) {
  return ["on", "true", "1"].includes(String(form.get(key) ?? "").toLowerCase());
}

export function parseAssignmentForm(form: FormData) {
  return assignmentInputSchema.safeParse({
    title: form.get("title"),
    instructions: form.get("instructions"),
    assignmentType: form.get("assignmentType"),
    intent: form.get("intent"),
    sectionSubjectId: form.get("sectionSubjectId"),
    bookId: form.get("bookId"),
    chapterId: form.get("chapterId"),
    totalMarks: form.get("totalMarks"),
    allowTextSubmission: checked(form, "allowTextSubmission"),
    allowFileSubmission: checked(form, "allowFileSubmission"),
    allowMultipleFiles: checked(form, "allowMultipleFiles"),
    maximumFiles: form.get("maximumFiles") || "1",
    maximumFileSizeMb: form.get("maximumFileSizeMb") || "10",
    acceptedFileTypes: form.getAll("acceptedFileTypes").map(String),
    allowLateSubmission: checked(form, "allowLateSubmission"),
    allowResubmission: checked(form, "allowResubmission"),
    maximumAttempts: form.get("maximumAttempts") || "1",
    publishAt: form.get("publishAt"),
    dueAt: form.get("dueAt"),
    closeAt: form.get("closeAt"),
  });
}

export const submissionDraftSchema = z.object({
  textResponse: z.string().max(20_000).transform((value) => value.trim() || null),
});

export const gradeSubmissionSchema = z.object({
  marksAwarded: z.union([z.literal(""), z.coerce.number().int().min(0).max(10_000)]).transform((value) => value === "" ? null : value),
  teacherFeedback: z.string().trim().max(5_000).transform((value) => value || null),
});
