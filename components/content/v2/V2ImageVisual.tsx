"use client";

import type { CSSProperties } from "react";
import { getV2CropImagePercentages, normalizeV2ImageTransform } from "@/lib/content-layout-v2";
import type { LayoutV2Frame } from "@/lib/content-layout-v2";

export default function V2ImageVisual({
  frame,
  src,
  loaded = true,
  failed = false,
  alt = "",
  onLoad,
  onError,
}: {
  frame: LayoutV2Frame;
  src: string | null;
  loaded?: boolean;
  failed?: boolean;
  alt?: string;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const transform = normalizeV2ImageTransform({ crop: frame.crop, zoom: frame.zoom, offsetX: frame.offsetX, offsetY: frame.offsetY });
  const percentages = getV2CropImagePercentages(transform);
  if (!src) return <Unavailable label="Image resource unavailable" />;
  if (failed) return <Unavailable label="Image unavailable" />;
  const imageStyle: CSSProperties = frame.fitMode === "CROP"
    ? { width: `${percentages.width}%`, height: `${percentages.height}%`, left: `${percentages.left}%`, top: `${percentages.top}%` }
    : { width: "100%", height: "100%" };
  const caption = frame.caption?.trim();
  return (
    <figure data-v2-bounded-image className="flex h-full w-full max-w-full flex-col overflow-hidden bg-slate-100">
      <div className="relative min-h-0 flex-1 overflow-hidden">
      {!loaded ? <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-xs font-semibold text-slate-400">Loading image…</div> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} onLoad={onLoad} onError={onError} className={`absolute max-h-full ${frame.fitMode === "CROP" ? "max-w-none object-cover" : "max-w-full object-contain"}`} style={imageStyle} />
      </div>
      {caption ? <figcaption className="shrink-0 bg-white/95 px-2 py-1 text-center text-xs leading-snug text-slate-700" data-v2-image-caption>{caption}</figcaption> : null}
    </figure>
  );
}

function Unavailable({ label }: { label: string }) {
  return <div className="flex h-full w-full items-center justify-center bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">{label}</div>;
}
