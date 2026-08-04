import type {
  LinkedAssetAudience,
} from "@/lib/content-linked-asset-types";
import type {
  MediaDisplayMode,
  MediaKind,
  MediaTargetType,
} from "@/lib/content-document";

export type ContentStudioMediaOption = {
  mediaKind: MediaKind;
  targetType: MediaTargetType;
  targetId: string;
  title: string;
  defaultLabel: string;
  sourceBadge: string;
  sourceDetail: string;
  scopeLabel: string;
  audienceOptions: LinkedAssetAudience[];
  defaultAudience: LinkedAssetAudience[];
  route: { href: string; openMode: "route" } | null;
  posterRoute: { href: string; openMode: "route" } | null;
  durationSeconds: number | null;
  published: boolean;
  teacherOnly: boolean;
};

export type ResolvedMediaBlock = {
  mediaKind: MediaKind;
  targetType: MediaTargetType;
  targetId: string;
  title: string;
  label: string;
  caption: string | null;
  sourceBadge: string;
  sourceDetail: string;
  scopeLabel: string;
  route: { href: string; openMode: "route" } | null;
  posterRoute: { href: string; openMode: "route" } | null;
  displayMode: MediaDisplayMode;
  autoplay: false;
  controls: boolean;
  required: boolean;
  audienceOptions: LinkedAssetAudience[];
  durationSeconds: number | null;
  published: boolean;
  teacherOnly: boolean;
  available: boolean;
  offline: {
    contentVersion: 2;
    mediaKind: MediaKind;
    targetType: MediaTargetType;
    targetId: string;
    posterResourceId: string | null;
  };
};

export function mediaKey(targetType: MediaTargetType, targetId: string) {
  return `${targetType}:${targetId}`;
}

export function mediaKindLabel(kind: MediaKind) {
  switch (kind) {
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "animation":
      return "Animation";
    case "html5":
      return "HTML5";
    case "simulation":
      return "Simulation";
  }
}

export function mediaDisplayModeLabel(mode: MediaDisplayMode) {
  switch (mode) {
    case "button":
      return "Button";
    case "fullWidth":
      return "Full width";
    case "inline":
    default:
      return "Inline";
  }
}
