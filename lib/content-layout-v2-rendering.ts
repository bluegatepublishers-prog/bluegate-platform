import type { LayoutV2Frame } from "@/lib/content-layout-v2";

export const V2_LAYER_ORDER = {
  BACKGROUND: 0,
  CONTENT: 1,
  DESIGN: 2,
  INTERACTIVE: 3,
} as const;

export function v2WrapOrder(frame: LayoutV2Frame) {
  return frame.wrapMode === "BEHIND_TEXT" ? -1 : frame.wrapMode === "IN_FRONT_OF_TEXT" ? 1 : 0;
}

export function sortV2Frames(frames: LayoutV2Frame[]) {
  return [...frames].sort((a, b) =>
    V2_LAYER_ORDER[a.layer] - V2_LAYER_ORDER[b.layer] ||
    v2WrapOrder(a) - v2WrapOrder(b) ||
    a.zIndex - b.zIndex ||
    a.readingOrder - b.readingOrder ||
    a.id.localeCompare(b.id),
  );
}

export function getV2FrameResourceId(frame: LayoutV2Frame) {
  if (frame.resourceId) return frame.resourceId;
  return frame.contentRef?.resourceId;
}

export function safeV2Color(value: string | undefined, fallback: string) {
  return value && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim())
    ? value.trim()
    : fallback;
}
