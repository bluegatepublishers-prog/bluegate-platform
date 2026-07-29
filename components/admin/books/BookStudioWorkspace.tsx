"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

const STORAGE_KEY = "bluegate:book-studio-workspace:v1";
const EXPLORER_MIN = 220;
const EXPLORER_MAX = 420;
const INSPECTOR_MIN = 300;
const INSPECTOR_MAX = 520;
const MAIN_MIN = 420;
const RAIL_WIDTH = 40;
const HANDLE_WIDTH = 8;

type ResizePanel = "explorer" | "inspector";

type DragState = {
  panel: ResizePanel;
  startX: number;
  startWidth: number;
};

export default function BookStudioWorkspace({
  explorer,
  workspace,
  inspector,
}: {
  explorer: ReactNode;
  workspace: ReactNode;
  inspector: ReactNode;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const hydratedRef = useRef(false);
  const [desktop, setDesktop] = useState(false);
  const [workspaceHeight, setWorkspaceHeight] = useState<number>();
  const [explorerWidth, setExplorerWidth] = useState(260);
  const [inspectorWidth, setInspectorWidth] = useState(320);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const value = JSON.parse(stored) as Record<string, unknown>;
        if (typeof value.explorerWidth === "number") {
          setExplorerWidth(
            clamp(value.explorerWidth, EXPLORER_MIN, EXPLORER_MAX),
          );
        }
        if (typeof value.inspectorWidth === "number") {
          setInspectorWidth(
            clamp(value.inspectorWidth, INSPECTOR_MIN, INSPECTOR_MAX),
          );
        }
        if (typeof value.explorerCollapsed === "boolean") {
          setExplorerCollapsed(value.explorerCollapsed);
        }
        if (typeof value.inspectorCollapsed === "boolean") {
          setInspectorCollapsed(value.inspectorCollapsed);
        }
      }
    } catch {
      // Storage can be unavailable or contain invalid user-managed data.
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          explorerWidth,
          inspectorWidth,
          explorerCollapsed,
          inspectorCollapsed,
        }),
      );
    } catch {
      // Workspace remains fully usable when persistence is unavailable.
    }
  }, [
    explorerCollapsed,
    explorerWidth,
    inspectorCollapsed,
    inspectorWidth,
  ]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    function syncViewport() {
      const isDesktop = media.matches;
      setDesktop(isDesktop);
      if (isDesktop && containerRef.current) {
        const top = containerRef.current.getBoundingClientRect().top;
        setWorkspaceHeight(Math.max(320, window.innerHeight - top - 16));
      } else {
        setWorkspaceHeight(undefined);
      }
    }

    syncViewport();
    media.addEventListener("change", syncViewport);
    window.addEventListener("resize", syncViewport);
    return () => {
      media.removeEventListener("change", syncViewport);
      window.removeEventListener("resize", syncViewport);
      restoreDocumentSelection();
    };
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        event.key.toLowerCase() !== "b" ||
        isTypingTarget(event.target)
      ) {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) {
        setInspectorCollapsed((value) => !value);
      } else {
        setExplorerCollapsed((value) => !value);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const gridTemplateColumns = `${explorerCollapsed ? RAIL_WIDTH : explorerWidth}px ${
    explorerCollapsed ? 0 : HANDLE_WIDTH
  }px minmax(0, 1fr) ${inspectorCollapsed ? 0 : HANDLE_WIDTH}px ${
    inspectorCollapsed ? RAIL_WIDTH : inspectorWidth
  }px`;

  function dynamicMaximum(panel: ResizePanel) {
    const available = containerRef.current?.clientWidth ?? 0;
    if (!available) {
      return panel === "explorer" ? EXPLORER_MAX : INSPECTOR_MAX;
    }
    const oppositeWidth =
      panel === "explorer"
        ? inspectorCollapsed
          ? RAIL_WIDTH
          : inspectorWidth
        : explorerCollapsed
          ? RAIL_WIDTH
          : explorerWidth;
    const oppositeHandle =
      panel === "explorer"
        ? inspectorCollapsed
          ? 0
          : HANDLE_WIDTH
        : explorerCollapsed
          ? 0
          : HANDLE_WIDTH;
    const ownMaximum =
      available - oppositeWidth - oppositeHandle - HANDLE_WIDTH - MAIN_MIN;
    const absoluteMaximum =
      panel === "explorer" ? EXPLORER_MAX : INSPECTOR_MAX;
    const absoluteMinimum =
      panel === "explorer" ? EXPLORER_MIN : INSPECTOR_MIN;
    return Math.max(absoluteMinimum, Math.min(absoluteMaximum, ownMaximum));
  }

  function resize(panel: ResizePanel, nextWidth: number) {
    const minimum = panel === "explorer" ? EXPLORER_MIN : INSPECTOR_MIN;
    const maximum = dynamicMaximum(panel);
    if (panel === "explorer") {
      setExplorerWidth(clamp(nextWidth, minimum, maximum));
    } else {
      setInspectorWidth(clamp(nextWidth, minimum, maximum));
    }
  }

  function startResize(
    panel: ResizePanel,
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (!desktop) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      panel,
      startX: event.clientX,
      startWidth: panel === "explorer" ? explorerWidth : inspectorWidth,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }

  function moveResize(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = event.clientX - drag.startX;
    resize(
      drag.panel,
      drag.panel === "explorer"
        ? drag.startWidth + delta
        : drag.startWidth - delta,
    );
  }

  function finishResize() {
    dragRef.current = null;
    restoreDocumentSelection();
  }

  function keyboardResize(
    panel: ResizePanel,
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.shiftKey ? 40 : 10;
    const direction = event.key === "ArrowRight" ? 1 : -1;
    if (panel === "explorer") {
      resize(panel, explorerWidth + direction * step);
    } else {
      resize(panel, inspectorWidth - direction * step);
    }
  }

  return (
    <section
      ref={containerRef}
      className="flex min-w-0 flex-col gap-4 overflow-x-hidden xl:grid xl:gap-0"
      style={
        desktop
          ? {
              gridTemplateColumns,
              height: workspaceHeight,
            }
          : undefined
      }
      aria-label="Book Studio workspace"
    >
      <Panel
        name="Explorer"
        collapsed={explorerCollapsed}
        onToggle={() => setExplorerCollapsed((value) => !value)}
        shortcut="Ctrl+B"
        position="left"
        className="xl:col-start-1"
      >
        {explorer}
      </Panel>

      <ResizeHandle
        panel="explorer"
        value={explorerWidth}
        minimum={EXPLORER_MIN}
        maximum={dynamicMaximum("explorer")}
        hidden={explorerCollapsed}
        onPointerDown={startResize}
        onPointerMove={moveResize}
        onPointerUp={finishResize}
        onKeyDown={keyboardResize}
      />

      <div className="min-h-[520px] min-w-0 overflow-y-auto overflow-x-hidden xl:col-start-3 xl:min-h-0 xl:h-full">
        {workspace}
      </div>

      <ResizeHandle
        panel="inspector"
        value={inspectorWidth}
        minimum={INSPECTOR_MIN}
        maximum={dynamicMaximum("inspector")}
        hidden={inspectorCollapsed}
        onPointerDown={startResize}
        onPointerMove={moveResize}
        onPointerUp={finishResize}
        onKeyDown={keyboardResize}
      />

      <Panel
        name="Inspector"
        collapsed={inspectorCollapsed}
        onToggle={() => setInspectorCollapsed((value) => !value)}
        shortcut="Ctrl+Shift+B"
        position="right"
        className="xl:col-start-5"
      >
        {inspector}
      </Panel>
    </section>
  );
}

function Panel({
  name,
  collapsed,
  onToggle,
  shortcut,
  position,
  className,
  children,
}: {
  name: "Explorer" | "Inspector";
  collapsed: boolean;
  onToggle: () => void;
  shortcut: string;
  position: "left" | "right";
  className: string;
  children: ReactNode;
}) {
  const action = collapsed ? `Open ${name}` : `Collapse ${name}`;
  return (
    <div
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
        collapsed ? "h-10 xl:h-full" : "min-h-[360px] xl:h-full xl:min-h-0"
      } ${className}`}
    >
      <div
        className={`flex h-10 shrink-0 items-center border-b border-slate-200 px-2 ${
          collapsed ? "justify-center xl:px-0" : "justify-between"
        }`}
      >
        <span
          className={`truncate px-2 text-xs font-bold uppercase tracking-wide text-slate-500 ${
            collapsed ? "xl:sr-only" : ""
          }`}
        >
          {name}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label={action}
          title={`${action} (${shortcut})`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-bold text-slate-600 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {collapsed
            ? position === "left"
              ? "›"
              : "‹"
            : position === "left"
              ? "‹"
              : "›"}
        </button>
      </div>
      <div
        aria-hidden={collapsed}
        className={`min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden ${
          collapsed
            ? "invisible h-0 flex-none pointer-events-none"
            : "visible"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ResizeHandle({
  panel,
  value,
  minimum,
  maximum,
  hidden,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
}: {
  panel: ResizePanel;
  value: number;
  minimum: number;
  maximum: number;
  hidden: boolean;
  onPointerDown: (
    panel: ResizePanel,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onKeyDown: (
    panel: ResizePanel,
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => void;
}) {
  return (
    <div
      role="separator"
      aria-label={`Resize ${panel} panel`}
      aria-orientation="vertical"
      aria-valuemin={minimum}
      aria-valuemax={maximum}
      aria-valuenow={value}
      tabIndex={hidden ? -1 : 0}
      title={`Resize ${panel} panel with drag or arrow keys`}
      onPointerDown={(event) => onPointerDown(panel, event)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(event) => onKeyDown(panel, event)}
      className={`group hidden h-full touch-none cursor-col-resize items-center justify-center outline-none ${
        panel === "explorer" ? "xl:col-start-2" : "xl:col-start-4"
      } xl:flex ${
        hidden ? "pointer-events-none invisible" : ""
      } focus-visible:bg-blue-50`}
    >
      <span className="h-16 w-1 rounded-full bg-slate-200 transition group-hover:bg-blue-400 group-focus-visible:bg-blue-500" />
    </div>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.matches("input, textarea, select") ||
    target.isContentEditable ||
    Boolean(target.closest("[contenteditable]:not([contenteditable='false'])"))
  );
}

function restoreDocumentSelection() {
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
}
