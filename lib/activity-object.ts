export const ACTIVITY_FIELD_DEFINITIONS = [
  ["introduction", "Introduction", "text"],
  ["objective", "Objective", "text"],
  ["materials", "Materials Required", "text"],
  ["time", "Time Required", "text"],
  ["activityType", "Activity Type", "text"],
  ["instructions", "Procedure / Instructions", "text"],
  ["observation", "Observation", "text"],
  ["discussion", "Discussion", "text"],
  ["result", "Result / Conclusion", "text"],
  ["reflection", "Reflection", "text"],
  ["safetyNote", "Safety Note", "text"],
  ["teacherNote", "Teacher Note", "text"],
  ["image", "Image", "resource"],
  ["video", "Video", "resource"],
  ["linkedResource", "Linked Resource", "resource"],
  ["custom", "Custom Field", "text"],
] as const;

export type ActivityFieldType = (typeof ACTIVITY_FIELD_DEFINITIONS)[number][0];
export type ActivityFieldEditorKind = (typeof ACTIVITY_FIELD_DEFINITIONS)[number][2];
export type ActivityFieldVisibility = {
  student: boolean;
  teacher: boolean;
};
export type ActivityField = {
  id: string;
  type: ActivityFieldType;
  label?: string;
  text?: string;
  resourceId?: string;
  visibility?: ActivityFieldVisibility;
};

export function activityFieldDefinition(type: ActivityFieldType) {
  return ACTIVITY_FIELD_DEFINITIONS.find((entry) => entry[0] === type) ?? ACTIVITY_FIELD_DEFINITIONS[ACTIVITY_FIELD_DEFINITIONS.length - 1];
}

export function activityFieldLabel(field: Pick<ActivityField, "type" | "label">) {
  return field.label?.trim() || activityFieldDefinition(field.type)[1];
}

export function activityFieldEditorKind(type: ActivityFieldType): ActivityFieldEditorKind {
  return activityFieldDefinition(type)[2];
}

export function defaultActivityFieldVisibility(type: ActivityFieldType): ActivityFieldVisibility {
  return type === "teacherNote" ? { student: false, teacher: true } : { student: true, teacher: true };
}
