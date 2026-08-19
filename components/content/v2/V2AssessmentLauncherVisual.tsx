"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { LayoutV2Frame } from "@/lib/content-layout-v2";
import { getV2AssessmentLauncherPayload } from "@/lib/v2-assessment-launcher";
import V2PublisherAssessmentLauncherOverlay from "@/components/content/v2/V2PublisherAssessmentLauncherOverlay";
import V2AssessmentLauncherOverlay, {
  type V2AssessmentLauncherOverlayMode,
} from "@/components/content/v2/V2AssessmentLauncherOverlay";

export default function V2AssessmentLauncherVisual({
  frame,
  openable = false,
  mode = "STUDENT",
  adminControls = false,
  onEdit,
}: {
  frame: LayoutV2Frame;
  openable?: boolean;
  mode?: V2AssessmentLauncherOverlayMode;
  adminControls?: boolean;
  onEdit?: () => void;
}) {
  const payload =
    getV2AssessmentLauncherPayload(frame);

  const [open, setOpen] =
    useState(false);

  const [overlayKey, setOverlayKey] =
    useState(0);

  const triggerRef =
    useRef<HTMLButtonElement>(null);

  const wasOpen = useRef(false);

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

  const shellClass =
    "relative flex h-full w-full items-center justify-center overflow-visible";

  const buttonClass =
    "relative inline-flex min-h-8 min-w-[58px] items-center justify-center rounded-[10px] border border-violet-800/80 bg-gradient-to-b from-fuchsia-500 via-violet-600 to-indigo-700 px-3 py-1 text-[11px] font-black uppercase tracking-[0.06em] text-white shadow-[0_4px_0_#4c1d95,0_7px_12px_rgba(76,29,149,0.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:translate-y-[2px] active:shadow-[0_2px_0_#4c1d95,0_4px_8px_rgba(76,29,149,0.24)]";

  if (!payload) {
    return (
      <div className={shellClass}>
        <div
          data-v2-assessment-launcher-unavailable
          className={`${buttonClass} opacity-50`}
        >
          QUESTION
        </div>
      </div>
    );
  }

  const label =
    payload.display.label;

  return (
    <>
      <div className={shellClass}>
        {openable ? (
          <button
            ref={triggerRef}
            type="button"
            data-v2-assessment-launcher
            data-v2-assessment-launcher-mode={
              mode
            }
            aria-haspopup="dialog"
            aria-label={
              mode === "PREVIEW"
                ? `Preview ${label} questions`
                : `Open ${label} practice`
            }
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
            className={buttonClass}
          >
            {label}
          </button>
        ) : (
          <div
            data-v2-assessment-launcher
            data-v2-assessment-launcher-mode="AUTHORING"
            aria-label={`${label} launcher`}
            className={buttonClass}
          >
            {label}
          </div>
        )}

        {adminControls ? (
          <div
            data-v2-assessment-launcher-admin-controls
            className="absolute left-1/2 top-full z-20 mt-2 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              onClick={() =>
                setOpen(true)
              }
              className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100"
            >
              Preview
            </button>

            <button
              type="button"
              onClick={() =>
                onEdit?.()
              }
              className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
            >
              Edit
            </button>
          </div>
        ) : null}
      </div>

      {open && payload.launcherType === "publisher-assessment" ? (
        <V2PublisherAssessmentLauncherOverlay
          assessmentId={payload.assessmentId}
          mode={mode === "PREVIEW" ? "PREVIEW" : "STUDENT"}
          onClose={close}
        />
      ) : null}

      {open &&
      payload.launcherType === "question" &&
      payload.target.exerciseId &&
      payload.target.groupId ? (
        <V2AssessmentLauncherOverlay
          key={`${payload.target.exerciseId}:${payload.target.groupId}:${payload.target.questionType}:${payload.target.questionIds?.join(",") ?? "all"}:${overlayKey}`}
          exerciseId={payload.target.exerciseId}
          groupId={payload.target.groupId}
          questionType={payload.target.questionType}
          questionIds={payload.target.questionIds}
          mode={mode}
          onClose={close}
          onRetry={() => setOverlayKey((current) => current + 1)}
        />
      ) : null}
    </>
  );
}