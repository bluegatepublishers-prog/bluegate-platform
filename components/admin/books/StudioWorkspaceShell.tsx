"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Focus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";

type ScreenMode = "mobile" | "tablet" | "desktop";
type DrawerPane = "left" | "right" | null;

export default function StudioWorkspaceShell({
  storageKey,
  title,
  leftLabel,
  leftTitle,
  left,
  toolbar,
  canvas,
  statusBar,
  rightLabel,
  rightTitle,
  right,
  leftWidth = 304,
  rightWidth = 336,
}: {
  storageKey: string;
  title: string;
  leftLabel: string;
  leftTitle: string;
  left: ReactNode;
  toolbar: ReactNode;
  canvas: ReactNode;
  statusBar?: ReactNode;
  rightLabel: string;
  rightTitle: string;
  right: ReactNode;
  leftWidth?: number;
  rightWidth?: number;
}) {
  const leftButtonRef = useRef<HTMLButtonElement | null>(null);
  const rightButtonRef = useRef<HTMLButtonElement | null>(null);
  const focusButtonRef = useRef<HTMLButtonElement | null>(null);
  const [screenMode, setScreenMode] = useState<ScreenMode>(() => detectScreenMode());
  const [leftOpen, setLeftOpen] = useState(() => readStoredBoolean(`${storageKey}:left`, true));
  const [rightOpen, setRightOpen] = useState(() => readStoredBoolean(`${storageKey}:right`, true));
  const [focusMode, setFocusMode] = useState(false);
  const [overlayPane, setOverlayPane] = useState<DrawerPane>(null);

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:left`, String(leftOpen));
      localStorage.setItem(`${storageKey}:right`, String(rightOpen));
    } catch {}
  }, [leftOpen, rightOpen, storageKey]);

  useEffect(() => {
    const updateMode = () => {
      const next = detectScreenMode();
      setScreenMode(next);
      if (next !== "desktop") {
        setOverlayPane(null);
        setFocusMode(false);
      }
    };
    window.addEventListener("resize", updateMode);
    return () => window.removeEventListener("resize", updateMode);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (overlayPane) {
        event.preventDefault();
        const current = overlayPane;
        setOverlayPane(null);
        if (current === "left") leftButtonRef.current?.focus();
        if (current === "right") rightButtonRef.current?.focus();
        return;
      }
      if (focusMode) {
        event.preventDefault();
        setFocusMode(false);
        focusButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusMode, overlayPane]);

  const dockLeft = screenMode === "desktop" && leftOpen && !focusMode;
  const dockRight = screenMode === "desktop" && rightOpen && !focusMode;

  function toggleLeft() {
    if (screenMode === "desktop") {
      if (focusMode) setFocusMode(false);
      setLeftOpen((current) => !current);
      return;
    }
    setOverlayPane((current) => (current === "left" ? null : "left"));
  }

  function toggleRight() {
    if (screenMode === "desktop") {
      if (focusMode) setFocusMode(false);
      setRightOpen((current) => !current);
      return;
    }
    setOverlayPane((current) => (current === "right" ? null : "right"));
  }

  return (
    <section className="flex min-h-[44rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              ref={leftButtonRef}
              type="button"
              aria-label={leftOpen ? `Hide ${leftLabel.toLowerCase()}` : `Show ${leftLabel.toLowerCase()}`}
              aria-expanded={screenMode === "desktop" ? dockLeft : overlayPane === "left"}
              onClick={toggleLeft}
              className={toolbarButton(dockLeft || overlayPane === "left")}
            >
              {dockLeft || overlayPane === "left" ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              {leftLabel}
            </button>
            <button
              ref={focusButtonRef}
              type="button"
              aria-label={focusMode ? "Exit focus mode" : "Focus canvas"}
              aria-pressed={focusMode}
              onClick={() => {
                setFocusMode((current) => !current);
                setOverlayPane(null);
              }}
              className={toolbarButton(focusMode)}
            >
              <Focus className="h-4 w-4" />
              Focus Canvas
            </button>
            <button
              ref={rightButtonRef}
              type="button"
              aria-label={rightOpen ? `Hide ${rightLabel.toLowerCase()}` : `Show ${rightLabel.toLowerCase()}`}
              aria-expanded={screenMode === "desktop" ? dockRight : overlayPane === "right"}
              onClick={toggleRight}
              className={toolbarButton(dockRight || overlayPane === "right")}
            >
              {dockRight || overlayPane === "right" ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              {rightLabel}
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-[#f7f4ed]">
        <aside
          className={`hidden shrink-0 overflow-hidden border-r border-slate-200 bg-white lg:block ${dockLeft ? "pointer-events-auto" : "pointer-events-none"}`}
          style={{ width: dockLeft ? leftWidth : 0 }}
          aria-hidden={!dockLeft}
        >
          <PanelSection title={leftTitle} onClose={() => setLeftOpen(false)}>
            {left}
          </PanelSection>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {!dockLeft && screenMode === "desktop" ? (
            <EdgeHandle side="left" label={`Open ${leftLabel.toLowerCase()}`} onClick={toggleLeft} />
          ) : null}
          {!dockRight && screenMode === "desktop" ? (
            <EdgeHandle side="right" label={`Open ${rightLabel.toLowerCase()}`} onClick={toggleRight} />
          ) : null}

          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            {toolbar}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mx-auto w-full max-w-[980px]">{canvas}</div>
          </div>
          {statusBar ? (
            <div className="border-t border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-600 backdrop-blur">
              {statusBar}
            </div>
          ) : null}
        </main>

        <aside
          className={`hidden shrink-0 overflow-hidden border-l border-slate-200 bg-white lg:block ${dockRight ? "pointer-events-auto" : "pointer-events-none"}`}
          style={{ width: dockRight ? rightWidth : 0 }}
          aria-hidden={!dockRight}
        >
          <PanelSection title={rightTitle} onClose={() => setRightOpen(false)}>
            {right}
          </PanelSection>
        </aside>

        {screenMode !== "desktop" && overlayPane ? (
          <div className="absolute inset-0 z-30 bg-slate-950/30 backdrop-blur-[2px]">
            <button type="button" aria-label="Close drawer" className="absolute inset-0" onClick={() => setOverlayPane(null)} />
            <div
              className={`absolute inset-y-0 ${overlayPane === "left" ? "left-0" : "right-0"} flex w-full max-w-full flex-col bg-white shadow-2xl sm:max-w-[26rem]`}
            >
              <PanelSection
                title={overlayPane === "left" ? leftTitle : rightTitle}
                onClose={() => {
                  const current = overlayPane;
                  setOverlayPane(null);
                  if (current === "left") leftButtonRef.current?.focus();
                  if (current === "right") rightButtonRef.current?.focus();
                }}
                overlay
              >
                {overlayPane === "left" ? left : right}
              </PanelSection>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PanelSection({
  title,
  onClose,
  children,
  overlay = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  overlay?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title.toLowerCase()}`}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        >
          {overlay ? <X className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

function EdgeHandle({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 px-2 py-4 text-slate-600 shadow-sm transition hover:bg-white xl:inline-flex ${side === "left" ? "left-2" : "right-2"}`}
    >
      {side === "left" ? <PanelLeftOpen className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
    </button>
  );
}

function toolbarButton(active: boolean) {
  return `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
    active
      ? "bg-slate-950 text-white"
      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
  }`;
}

function detectScreenMode(): ScreenMode {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}
