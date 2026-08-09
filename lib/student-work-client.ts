import type { StudentWorkTargetInput, StudentWorkTypeName } from "@/lib/student-work-policy";

export type StudentWorkClientStatus = "CURRENT" | "STALE" | "MISSING_TARGET";

export type StudentWorkClientItem = {
  id: string;
  type: StudentWorkTypeName;
  targetKey: string;
  target: StudentWorkTargetInput;
  payload: unknown;
  revision: number;
  status: StudentWorkClientStatus;
  createdAt: string;
  updatedAt: string;
};

export type StudentWorkClientState = "IDLE" | "SAVING" | "SAVED" | "NOT_SAVED" | "CONFLICT";

const TARGET_KEYS = ["chapterId", "moduleId", "pageId", "frameId", "childFrameId", "questionId", "segmentId"] as const;

export function studentWorkTargetIdentity(type: StudentWorkTypeName, target: StudentWorkTargetInput) {
  if (type === "READING_POSITION") return JSON.stringify([type]);
  return JSON.stringify([type, ...TARGET_KEYS.map((key) => target[key] ?? null)]);
}

export function studentWorkTargetMatches(itemTarget: StudentWorkTargetInput, requested: StudentWorkTargetInput) {
  return Object.entries(requested).every(([key, value]) => itemTarget[key as keyof StudentWorkTargetInput] === value);
}

export function buildStudentWorkClientMap(items: StudentWorkClientItem[]) {
  const byIdentity = new Map<string, StudentWorkClientItem>();
  const byId = new Map<string, StudentWorkClientItem>();
  for (const item of items) {
    byIdentity.set(studentWorkTargetIdentity(item.type, item.target), item);
    byId.set(item.id, item);
  }
  return { byIdentity, byId };
}

export function payloadText(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const value = payload as Record<string, unknown>;
  return typeof value.text === "string" ? value.text : typeof value.value === "string" ? value.value : "";
}

export function payloadOptionIds(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const optionIds = (payload as Record<string, unknown>).optionIds;
  return Array.isArray(optionIds) ? optionIds.filter((value): value is string => typeof value === "string") : [];
}

export function payloadHighlightText(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const anchor = (payload as Record<string, unknown>).anchor;
  if (!anchor || typeof anchor !== "object" || Array.isArray(anchor)) return "";
  const text = (anchor as Record<string, unknown>).text;
  return typeof text === "string" ? text : "";
}
