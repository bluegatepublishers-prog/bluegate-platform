import type { CSSProperties, ReactNode } from "react";
import type { LayoutV2Frame } from "@/lib/content-layout-v2";
import { getEducationalObjectDefinition, isEducationalObjectType } from "@/lib/educational-object-registry";
import { sortV2Frames } from "@/lib/content-layout-v2-rendering";

export default function V2EducationalVisual({ frame, children, body, header }: { frame: LayoutV2Frame; children: ReactNode; body?: ReactNode; header?: ReactNode }) {
  const payload = frame.payload && typeof frame.payload === "object" ? frame.payload as Record<string, unknown> : {};
  const objectType = isEducationalObjectType(payload.educationalObjectType) ? payload.educationalObjectType : "didYouKnow";
  const definition = getEducationalObjectDefinition(objectType);
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title : definition.defaultTitle;
  const value = typeof payload.body === "string" ? payload.body : typeof payload.text === "string" ? payload.text : "";
  const radius = typeof payload.radius === "number" ? Math.max(0, Math.min(32, payload.radius)) : 8;
  return (
    <div data-v2-educational-block data-v2-educational-theme={objectType} className="relative h-full w-full overflow-hidden" style={{ backgroundColor: definition.theme.tint, border: `1px solid ${definition.theme.border}`, borderRadius: radius }}>
      {header ?? <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-8 items-center gap-1.5 border-b px-2 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: definition.theme.accent, borderColor: definition.theme.border, backgroundColor: definition.theme.tint }}>
        <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-white/80 text-[11px]">{definition.icon}</span>
        <span className="truncate">{title}</span>
      </div>}
      {body ?? <p data-v2-educational-body className="absolute inset-x-3 top-10 z-0 whitespace-pre-wrap text-sm leading-5" style={educationalTextStyle(frame)}>{value || definition.defaultPlaceholder}</p>}
      {children}
    </div>
  );
}

function educationalTextStyle(frame: LayoutV2Frame): CSSProperties {
  return {
    color: frame.textColor ?? "#1e293b",
    fontFamily: frame.fontFamily,
    fontSize: frame.fontSize,
    fontWeight: frame.fontWeight,
    fontStyle: frame.fontStyle,
    lineHeight: frame.lineHeight,
    textAlign: frame.alignment,
    direction: frame.direction === "RTL" ? "rtl" : "ltr",
  };
}

export function v2EducationalChildren(frame: LayoutV2Frame) {
  return sortV2Frames(frame.children ?? []);
}
