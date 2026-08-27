"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ClipboardList } from "lucide-react";

import type { LayoutV2Frame } from "@/lib/content-layout-v2";
import { getV2WorksheetLauncherPayload } from "@/lib/v2-worksheet-launcher";
import V2WorksheetLauncherOverlay, {
  type V2WorksheetLauncherOverlayMode,
} from "@/components/content/v2/V2WorksheetLauncherOverlay";

export default function V2WorksheetLauncherVisual({
  frame,
  openable = false,
  mode = "STUDENT",
  adminControls = false,
  immutableRelease = false,
  onEdit,
}: {
  frame: LayoutV2Frame;
  openable?: boolean;
  mode?: V2WorksheetLauncherOverlayMode;
  adminControls?: boolean;
  immutableRelease?: boolean;
  onEdit?: () => void;
}) {
  const payload =
    getV2WorksheetLauncherPayload(frame);

  const [open, setOpen] =
    useState(false);

  const triggerRef =
    useRef<HTMLButtonElement>(null);

  const wasOpen =
    useRef(false);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (
      wasOpen.current &&
      !open
    ) {
      triggerRef.current?.focus();
    }

    wasOpen.current = open;
  }, [open]);

  /*
   * In Content Studio authoring, the launcher should preview
   * the worksheet instead of attempting to create a student
   * worksheet attempt.
   */
  const overlayMode: V2WorksheetLauncherOverlayMode =
    openable && mode === "STUDENT"
      ? "STUDENT"
      : "PREVIEW";

  const shellClass =
    "relative flex h-full w-full items-center justify-center overflow-visible";

  /*
   * Compact raised 3D launcher.
   *
   * Keep the actual launcher small even when its V2 frame is
   * larger. The frame remains selectable/resizable independently.
   */
  const buttonClass = [
    "group",
    "relative",
    "inline-flex",
    "h-11",
    "min-w-[132px]",
    "max-w-[190px]",
    "items-center",
    "justify-center",
    "gap-2",
    "rounded-xl",
    "border",
    "border-violet-800",
    "bg-gradient-to-b",
    "from-fuchsia-500",
    "via-violet-600",
    "to-indigo-700",
    "px-4",
    "text-[12px]",
    "font-black",
    "uppercase",
    "tracking-[0.08em]",
    "text-white",
    "cursor-pointer",
    "select-none",

    /*
     * 3D depth.
     */
    "shadow-[0_5px_0_#4c1d95,0_9px_16px_rgba(76,29,149,0.32)]",

    /*
     * Interaction.
     */
    "transition-all",
    "duration-150",
    "hover:-translate-y-[2px]",
    "hover:brightness-110",
    "hover:shadow-[0_7px_0_#4c1d95,0_12px_20px_rgba(76,29,149,0.34)]",

    "active:translate-y-[3px]",
    "active:shadow-[0_2px_0_#4c1d95,0_5px_9px_rgba(76,29,149,0.26)]",

    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-violet-400",
    "focus-visible:ring-offset-2",
  ].join(" ");

  if (!payload) {
    return (
      <div className={shellClass}>
        <div
          data-v2-worksheet-launcher-unavailable
          className={`${buttonClass} cursor-default opacity-50`}
        >
          <ClipboardList
            aria-hidden="true"
            className="h-4 w-4 shrink-0"
          />

          <span>Worksheet</span>
        </div>
      </div>
    );
  }

  function openWorksheet(
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.PointerEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      <div className={shellClass}>
        {/*
         * Always use a real button.
         *
         * Previously authoring mode rendered a DIV when
         * openable=false, which is why clicking WORKSHEET
         * on the V2 canvas did nothing.
         */}
        <button
          ref={triggerRef}
          type="button"
          data-v2-worksheet-launcher
          data-v2-worksheet-launcher-mode={
            openable
              ? mode
              : "AUTHORING"
          }
          aria-haspopup="dialog"
          aria-label={
            overlayMode === "PREVIEW"
              ? `Preview ${payload.display.label}`
              : `Open ${payload.display.label}`
          }
          onPointerDown={(event) => {
            /*
             * Prevent the frame canvas from swallowing the
             * launcher interaction.
             */
            event.stopPropagation();
          }}
          onClick={openWorksheet}
          className={buttonClass}
        >
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/25 bg-white/15 shadow-inner"
          >
            <ClipboardList className="h-4 w-4" />
          </span>

          <span className="truncate">
            {payload.display.label || "WORKSHEET"}
          </span>

          {/*
           * Small top highlight strengthens the physical
           * raised-button appearance.
           */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 top-[2px] h-px rounded-full bg-white/40"
          />
        </button>

        {adminControls ? (
          <div
            data-v2-worksheet-launcher-admin-controls
            className="absolute left-1/2 top-full z-30 mt-3 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(true);
              }}
              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100"
            >
              Preview
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.();
              }}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-200"
            >
              Edit
            </button>
          </div>
        ) : null}
      </div>

      {open ? (
        <V2WorksheetLauncherOverlay
          key={`${payload.worksheetId}:${overlayMode}`}
          worksheetId={
            payload.worksheetId
          }
          bookId={payload.bookId}
          releaseVersionId={payload.releaseVersionId}
          mode={overlayMode}
          onClose={close}
        />
      ) : null}
    </>
  );
}