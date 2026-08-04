export const LINKED_ASSET_KINDS = [
  "video",
  "worksheet",
  "activity",
  "exercise",
  "resource",
  "learningOutcome",
  "qr",
] as const;

export const LINKED_ASSET_TARGET_TYPES = [
  "RESOURCE",
  "BOOK_RESOURCE_LINK",
  "VIDEO_LESSON",
  "CHAPTER_ACTIVITY",
  "PUBLISHER_WORKSHEET",
  "BOOK_EXERCISE",
  "CHAPTER_LEARNING_OUTCOME",
  "DYNAMIC_QR_CODE",
] as const;

export const LINKED_ASSET_AUDIENCES = ["TEACHER", "STUDENT"] as const;

export const LINKED_ASSET_DISPLAY_STYLES = ["button", "inline", "callout"] as const;

export const LINKED_ASSET_OPEN_MODES = ["route", "download"] as const;

export const CONTENT_SECTION_AUDIENCES = ["TEACHER", "STUDENT", "BOTH"] as const;

export const CONTENT_SECTION_CONTEXTS = ["ADMIN", "TEACHER", "STUDENT"] as const;

export const CONTENT_SECTION_ICONS = [
  "book-open",
  "play-circle",
  "clipboard-list",
  "file-text",
  "graduation-cap",
  "lightbulb",
  "flask",
  "layers",
] as const;

export type LinkedAssetKind = (typeof LINKED_ASSET_KINDS)[number];
export type LinkedAssetTargetType = (typeof LINKED_ASSET_TARGET_TYPES)[number];
export type LinkedAssetAudience = (typeof LINKED_ASSET_AUDIENCES)[number];
export type LinkedAssetDisplayStyle = (typeof LINKED_ASSET_DISPLAY_STYLES)[number];
export type LinkedAssetOpenMode = (typeof LINKED_ASSET_OPEN_MODES)[number];
export type ContentSectionAudience = (typeof CONTENT_SECTION_AUDIENCES)[number];
export type ContentSectionContext = (typeof CONTENT_SECTION_CONTEXTS)[number];
export type ContentSectionIcon = (typeof CONTENT_SECTION_ICONS)[number];

export type ContentSectionDefinitionSummary = {
  id: string;
  code: string;
  label: string;
  icon: ContentSectionIcon;
  audience: ContentSectionAudience;
  allowedAssetKinds: LinkedAssetKind[];
  visibleIn: ContentSectionContext[];
  sortOrder: number;
  active: boolean;
  published: boolean;
  archived: boolean;
  updatedAt: string;
};

export type ContentStudioAssetOption = {
  assetKind: LinkedAssetKind;
  targetType: LinkedAssetTargetType;
  targetId: string;
  title: string;
  defaultLabel: string;
  sourceBadge: string;
  sourceDetail: string;
  scopeLabel: string;
  audienceOptions: LinkedAssetAudience[];
  defaultAudience: LinkedAssetAudience[];
  displayStyles: LinkedAssetDisplayStyle[];
  openModes: LinkedAssetOpenMode[];
  teacherOnly: boolean;
  route: {
    href: string;
    openMode: LinkedAssetOpenMode;
  } | null;
};

export type ResolvedLinkedAsset = {
  assetKind: LinkedAssetKind;
  targetType: LinkedAssetTargetType;
  targetId: string;
  title: string;
  label: string;
  sourceBadge: string;
  sourceDetail: string;
  scopeLabel: string;
  teacherOnly: boolean;
  audienceOptions: LinkedAssetAudience[];
  openModes: LinkedAssetOpenMode[];
  route: {
    href: string;
    openMode: LinkedAssetOpenMode;
  } | null;
  available: boolean;
};

export function linkedAssetKey(targetType: LinkedAssetTargetType, targetId: string) {
  return `${targetType}:${targetId}`;
}

export function linkedAssetKindLabel(kind: LinkedAssetKind) {
  switch (kind) {
    case "video":
      return "Video";
    case "worksheet":
      return "Worksheet";
    case "activity":
      return "Activity";
    case "exercise":
      return "Exercise";
    case "resource":
      return "Resource";
    case "learningOutcome":
      return "Learning Outcome";
    case "qr":
      return "QR";
  }
}

export function linkedAssetAudienceLabel(audience: LinkedAssetAudience) {
  return audience === "TEACHER" ? "Teacher" : "Student";
}

export function linkedAssetDisplayStyleLabel(style: LinkedAssetDisplayStyle) {
  switch (style) {
    case "button":
      return "Button";
    case "inline":
      return "Inline";
    case "callout":
      return "Callout";
  }
}

export function linkedAssetOpenModeLabel(mode: LinkedAssetOpenMode) {
  return mode === "download" ? "Download" : "Open";
}

export function contentSectionAudienceLabel(audience: ContentSectionAudience) {
  switch (audience) {
    case "TEACHER":
      return "Teacher";
    case "STUDENT":
      return "Student";
    case "BOTH":
      return "Teacher + Student";
  }
}

export function contentSectionContextLabel(context: ContentSectionContext) {
  switch (context) {
    case "ADMIN":
      return "Admin";
    case "TEACHER":
      return "Teacher";
    case "STUDENT":
      return "Student";
  }
}
