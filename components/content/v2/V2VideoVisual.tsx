"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useV2OverlayPortalTarget } from "@/components/content/v2/V2OverlayPortalContext";

import type { LayoutV2Frame, LayoutV2VideoDisplayMode } from "@/lib/content-layout-v2";

type VideoPresentation = "AUTHORING" | "DELIVERY";

export default function V2VideoVisual({
  frame,
  src,
  displayMode,
  presentation = "AUTHORING",
}: {
  frame: LayoutV2Frame;
  src: string;
  displayMode: LayoutV2VideoDisplayMode;
  presentation?: VideoPresentation;
}) {
  const [open, setOpen] = useState(false);
  const title = frame.narrationLabel || frame.altText || "Play Video";
  const delivery = presentation === "DELIVERY";

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    globalThis.document.addEventListener("keydown", closeOnEscape);
    return () => globalThis.document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (displayMode === "PLAYER") {
    return <VideoPlayer src={src} title={title} restricted={delivery} />;
  }

  return (
    <>
      <button
        type="button"
        data-v2-video-card
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className="flex h-full w-full items-center gap-3 rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-slate-50 px-4 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg text-white">▶</span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-900">Play Video</span>
          <span className="block truncate text-xs font-medium text-slate-600">{title}</span>
        </span>
      </button>
      {open ? <V2VideoModal src={src} title={title} restricted={delivery} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function VideoPlayer({ src, title, restricted }: { src: string; title: string; restricted: boolean }) {
  return (
    <video
      data-v2-video-player
      aria-label={title}
      className="h-full w-full bg-slate-950 object-contain"
      controls
      controlsList={restricted ? "nodownload noremoteplayback" : undefined}
      disablePictureInPicture={restricted}
      disableRemotePlayback={restricted}
      onContextMenu={restricted ? (event) => event.preventDefault() : undefined}
      src={src}
    />
  );
}

export function V2VideoModal({ src, title, restricted, onClose }: { src: string; title: string; restricted: boolean; onClose: () => void }) {
  const portalTarget = useV2OverlayPortalTarget();
  if (!portalTarget) return null;
  return createPortal(
    <div data-v2-video-modal role="dialog" aria-modal="true" aria-label={title + " video player"} className="pointer-events-auto fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/75 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-5xl rounded-xl bg-slate-950 p-3 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between gap-3 text-white">
          <p className="truncate text-sm font-semibold">{title}</p>
          <button type="button" onClick={onClose} className="rounded-md border border-white/30 px-3 py-1 text-sm font-semibold hover:bg-white/10">Close</button>
        </div>
        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          <VideoPlayer src={src} title={title} restricted={restricted} />
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
