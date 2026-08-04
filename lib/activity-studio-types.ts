import type { PublisherActivityType } from "@prisma/client";

export const ACTIVITY_TYPES = [
  "WARM_UP",
  "THINK_AND_DISCUSS",
  "PAIR_WORK",
  "GROUP_WORK",
  "CLASSROOM_ACTIVITY",
  "EXPERIMENT",
  "LAB_ACTIVITY",
  "OBSERVATION",
  "OUTDOOR_ACTIVITY",
  "PROJECT",
  "HOME_ACTIVITY",
  "REFLECTION",
  "ROLE_PLAY",
  "RESEARCH",
  "CREATIVE_TASK",
] as const satisfies readonly PublisherActivityType[];

export const ACTIVITY_AUDIENCES = ["TEACHER", "STUDENT", "BOTH"] as const;
export const ACTIVITY_DIFFICULTIES = ["FOUNDATIONAL", "MODERATE", "ADVANCED"] as const;

export type ActivityAudience = (typeof ACTIVITY_AUDIENCES)[number];
export type ActivityDifficulty = (typeof ACTIVITY_DIFFICULTIES)[number];

export type ActivityResourceAttachment = {
  id: string;
  title: string;
  type: string;
  route: { href: string; openMode: "route" };
  teacherOnly: boolean;
  published: boolean;
};

export type ResolvedActivityBlock = {
  activity: ActivityStudioRecord;
  attachments: ActivityResourceAttachment[];
} | null;

export type ActivityStudioRecord = {
  id: string;
  chapterId: string;
  moduleId: string | null;
  topicId: string | null;
  title: string;
  activityType: PublisherActivityType;
  shortDescription: string | null;
  objective: string;
  materials: string | null;
  durationMinutes: number | null;
  groupType: string | null;
  preparation: string | null;
  instructions: string;
  steps: string[];
  observationPrompts: string[];
  reflectionPrompts: string[];
  expectedLearning: string | null;
  assessment: string | null;
  safetyNotes: string | null;
  teacherGuidance: string | null;
  studentInstructions: string | null;
  attachmentResourceIds: string[];
  imageResourceId: string | null;
  videoResourceId: string | null;
  diagramResourceId: string | null;
  audience: ActivityAudience;
  difficulty: ActivityDifficulty | null;
  active: boolean;
  published: boolean;
  archived: boolean;
  sortOrder: number;
  updatedAt: string;
};

export function activityTypeLabel(type: PublisherActivityType) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
