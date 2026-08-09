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
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      {!loaded ? <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-xs font-semibold text-slate-400">Loading image…</div> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} onLoad={onLoad} onError={onError} className={`absolute max-w-none ${frame.fitMode === "FIT" ? "object-contain" : "object-cover"}`} style={imageStyle} />
    </div>
  );
}

function Unavailable({ label }: { label: string }) {
  return <div className="flex h-full w-full items-center justify-center bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">{label}</div>;
}
