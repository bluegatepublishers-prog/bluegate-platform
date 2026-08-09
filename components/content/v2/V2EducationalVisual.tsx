import type { ReactNode } from "react";
import type { LayoutV2Frame } from "@/lib/content-layout-v2";
import { safeV2Color, sortV2Frames } from "@/lib/content-layout-v2-rendering";

export default function V2EducationalVisual({ frame, children }: { frame: LayoutV2Frame; children: ReactNode }) {
  const payload = frame.payload && typeof frame.payload === "object" ? frame.payload as Record<string, unknown> : {};
  const title = typeof payload.title === "string" ? payload.title : "Educational container";
  const fill = safeV2Color(typeof payload.fill === "string" ? payload.fill : undefined, "#eef2ff");
  const border = safeV2Color(typeof payload.border === "string" ? payload.border : undefined, "#818cf8");
  const radius = typeof payload.radius === "number" ? Math.max(0, Math.min(32, payload.radius)) : 8;
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: fill, border: `1px solid ${border}`, borderRadius: radius }}>
      <div className="pointer-events-none absolute left-2 top-1 z-10 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-900/70">{title}</div>
      {children}
    </div>
  );
}

export function v2EducationalChildren(frame: LayoutV2Frame) {
  return sortV2Frames(frame.children ?? []);
}
