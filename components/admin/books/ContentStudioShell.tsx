"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Eye,
  Focus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SquarePen,
  X,
} from "lucide-react";

import ContentStudioTree from "@/components/admin/books/ContentStudioTree";
import type { ContentTreeNode, VirtualFolderKind } from "@/lib/content-studio-tree";

const chapterTabs: Array<{ key: "overview" | VirtualFolderKind; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "outcomes", label: "Outcomes" },
  { key: "activities", label: "Activities" },
  { key: "exercises", label: "Exercises" },
  { key: "questions", label: "Questions" },
  { key: "resources", label: "Resources" },
  { key: "qr", label: "QR Codes" },
];

const HIERARCHY_WIDTH = 304;
const INSPECTOR_WIDTH = 336;
type ScreenMode = "mobile" | "tablet" | "desktop";
type DrawerPane = "hierarchy" | "inspector" | null;

export default function ContentStudioShell({
  bookId,
  bookTitle,
  root,
  selectedKey,
  selectedTitle,
  inspector,
  children,
}: {
  bookId: string;
  bookTitle: string;
  root: ContentTreeNode;
  selectedKey: string;
  selectedTitle: string;
  inspector: ReactNode;
  children: ReactNode;
}) {
  const chapterState = useMemo(() => {
    const parts = selectedKey.split(":");
    const chapterId =
      parts[0] === "CHAPTER" ? parts[1] : parts[0] === "FOLDER" ? parts[1] : null;
    const activeTab = parts[0] === "FOLDER" ? parts[2] : "overview";
    return { chapterId, activeTab };
  }, [selectedKey]);

  const hierarchyButtonRef = useRef<HTMLButtonElement | null>(null);
  const inspectorButtonRef = useRef<HTMLButtonElement | null>(null);
  const focusButtonRef = useRef<HTMLButtonElement | null>(null);
  const [screenMode, setScreenMode] = useState<ScreenMode>(() => detectScreenMode());
  const [hierarchyOpen, setHierarchyOpen] = useState(() =>
    readStoredBoolean(`bluegate:studio:${bookId}:hierarchy`, true),
  );
  const [inspectorOpen, setInspectorOpen] = useState(() =>
    readStoredBoolean(`bluegate:studio:${bookId}:inspector`, true),
  );
  const [focusMode, setFocusMode] = useState(false);
  const [overlayPane, setOverlayPane] = useState<DrawerPane>(null);

  useEffect(() => {
    try {
      localStorage.setItem(`bluegate:studio:${bookId}:hierarchy`, String(hierarchyOpen));
      localStorage.setItem(`bluegate:studio:${bookId}:inspector`, String(inspectorOpen));
    } catch {}
  }, [bookId, hierarchyOpen, inspectorOpen]);

  useEffect(() => {
    const updateMode = () => {
      const nextMode = detectScreenMode();
      setScreenMode(nextMode);
      if (nextMode === "mobile" || nextMode === "tablet") {
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
        if (current === "hierarchy") hierarchyButtonRef.current?.focus();
        if (current === "inspector") inspectorButtonRef.current?.focus();
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

  const desktopDockHierarchy = !focusMode && screenMode === "desktop" && hierarchyOpen;
  const desktopDockInspector = !focusMode && screenMode === "desktop" && inspectorOpen;

  function confirmDiscard(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      document.querySelector("[data-content-editor-dirty='true']") &&
      !confirm("Discard unsaved changes and switch content?")
    ) {
      event.preventDefault();
    }
  }

  function toggleHierarchy() {
    if (screenMode === "mobile" || screenMode === "tablet") {
      setOverlayPane((current) => (current === "hierarchy" ? null : "hierarchy"));
      return;
    }
    if (focusMode) setFocusMode(false);
    setHierarchyOpen((current) => !current);
  }

  function toggleInspector() {
    if (screenMode === "mobile" || screenMode === "tablet") {
      setOverlayPane((current) => (current === "inspector" ? null : "inspector"));
      return;
    }
    if (focusMode) setFocusMode(false);
    setInspectorOpen((current) => !current);
  }

  function enableFocusMode() {
    setFocusMode(true);
    setOverlayPane(null);
  }

  return (
    <section className="flex min-h-[calc(100dvh-10rem)] flex-col gap-3">
      <header className="sticky top-0 z-30 rounded-[1.5rem] border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">
              Content Studio
            </p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="truncate font-semibold text-slate-900">{bookTitle}</span>
              <span className="text-slate-300">/</span>
              <span className="truncate">{selectedTitle}</span>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
            <button
              ref={hierarchyButtonRef}
              type="button"
              aria-label={hierarchyOpen ? "Hide hierarchy" : "Show hierarchy"}
              aria-expanded={
                screenMode === "mobile" || screenMode === "tablet"
                  ? overlayPane === "hierarchy"
                  : desktopDockHierarchy
              }
              onClick={toggleHierarchy}
              className={toolbarButton(
                (screenMode === "mobile" || screenMode === "tablet"
                  ? overlayPane === "hierarchy"
                  : desktopDockHierarchy) === true,
              )}
            >
              {desktopDockHierarchy || overlayPane === "hierarchy" ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
              Hierarchy
            </button>
            <button
              ref={focusButtonRef}
              type="button"
              aria-label={focusMode ? "Exit focus canvas" : "Focus canvas"}
              aria-pressed={focusMode}
              onClick={() => (focusMode ? setFocusMode(false) : enableFocusMode())}
              className={toolbarButton(focusMode)}
            >
              <Focus className="h-4 w-4" />
              Focus Canvas
            </button>
            <button
              ref={inspectorButtonRef}
              type="button"
              aria-label={inspectorOpen ? "Hide inspector" : "Show inspector"}
              aria-expanded={
                screenMode === "mobile" || screenMode === "tablet"
                  ? overlayPane === "inspector"
                  : desktopDockInspector
              }
              onClick={toggleInspector}
              className={toolbarButton(
                (screenMode === "mobile" || screenMode === "tablet"
                  ? overlayPane === "inspector"
                  : desktopDockInspector) === true,
              )}
            >
              {desktopDockInspector || overlayPane === "inspector" ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
              Inspector
            </button>
            <Link
              href={`/admin/books/${bookId}/preview`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Link>
            <Link
              href={`/admin/books/${bookId}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <SquarePen className="h-4 w-4" />
              Book Settings
            </Link>
          </div>
        </div>

        {chapterState.chapterId ? (
          <nav aria-label="Chapter editor" className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {chapterTabs.map((tab) => {
              const selected = chapterState.activeTab === tab.key;
              const target =
                tab.key === "overview"
                  ? `CHAPTER:${chapterState.chapterId}`
                  : `FOLDER:${chapterState.chapterId}:${tab.key}`;
              return (
                <Link
                  key={tab.key}
                  href={`/admin/books/${bookId}/content?selected=${encodeURIComponent(target)}`}
                  onClick={confirmDiscard}
                  aria-current={selected ? "page" : undefined}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    selected
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#f3efe6] shadow-sm">
        <aside
          className={`hidden shrink-0 overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 lg:block ${
            desktopDockHierarchy ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{ width: desktopDockHierarchy ? HIERARCHY_WIDTH : 0 }}
          aria-hidden={!desktopDockHierarchy}
        >
          <div className="flex h-full w-[304px] flex-col">
            <PanelHeader
              label="Hierarchy"
              title="Book Structure"
              onClose={() => {
                setHierarchyOpen(false);
                hierarchyButtonRef.current?.focus();
              }}
            />
            <ContentStudioTree bookId={bookId} root={root} selectedKey={selectedKey} />
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {!desktopDockHierarchy && screenMode === "desktop" ? (
            <EdgeHandle side="left" label="Open hierarchy" onClick={toggleHierarchy} />
          ) : null}
          {!desktopDockInspector && screenMode === "desktop" ? (
            <EdgeHandle side="right" label="Open inspector" onClick={toggleInspector} />
          ) : null}

          <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-5">{children}</div>
        </main>

          <aside
            className={`hidden shrink-0 overflow-hidden border-l border-slate-200 bg-white transition-[width] duration-200 lg:block ${
              desktopDockInspector ? "pointer-events-auto" : "pointer-events-none"
            }`}
            style={{ width: desktopDockInspector ? INSPECTOR_WIDTH : 0 }}
            aria-hidden={!desktopDockInspector}
          >
            <div className="flex h-full w-[336px] flex-col">
              <PanelHeader
                label="Inspector"
                title="Contextual Details"
                onClose={() => {
                  setInspectorOpen(false);
                  inspectorButtonRef.current?.focus();
                }}
              />
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{inspector}</div>
            </div>
          </aside>

        {(screenMode === "mobile" || screenMode === "tablet") && overlayPane ? (
          <div className="absolute inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]">
            <button
              type="button"
              aria-label="Close overlay"
              className="absolute inset-0"
              onClick={() => setOverlayPane(null)}
            />
            <div
              className={`absolute inset-y-0 ${
                overlayPane === "hierarchy" ? "left-0" : "right-0"
              } flex h-full w-full max-w-full flex-col bg-white shadow-2xl ${
                screenMode === "tablet" ? "sm:max-w-[26rem]" : ""
              }`}
            >
              <PanelHeader
                label={overlayPane === "hierarchy" ? "Hierarchy" : "Inspector"}
                title={overlayPane === "hierarchy" ? "Book Structure" : "Contextual Details"}
                onClose={() => {
                  const current = overlayPane;
                  setOverlayPane(null);
                  if (current === "hierarchy") hierarchyButtonRef.current?.focus();
                  if (current === "inspector") inspectorButtonRef.current?.focus();
                }}
                overlay
              />
              {overlayPane === "hierarchy" ? (
                <ContentStudioTree bookId={bookId} root={root} selectedKey={selectedKey} />
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{inspector}</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PanelHeader({
  label,
  title,
  onClose,
  overlay = false,
}: {
  label: string;
  title: string;
  onClose: () => void;
  overlay?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{title}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={`Close ${label.toLowerCase()}`}
        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
      >
        {overlay ? <X className="h-4 w-4" /> : label === "Hierarchy" ? <PanelLeftClose className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
      </button>
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
      className={`absolute top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 px-2 py-4 text-slate-600 shadow-sm transition hover:bg-white xl:inline-flex ${
        side === "left" ? "left-2" : "right-2"
      }`}
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
