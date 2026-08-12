"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Hand,
  Minus,
  Plus,
} from "lucide-react";

import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";

export type SmartBookViewerProps = {
  pdfUrl: string;
  initialPage?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onDocumentLoad?: (info: {
    totalPages: number;
  }) => void;
  showFullscreen?: boolean;
  className?: string;
};

type FitMode = "PAGE" | "WIDTH" | null;

type DragState = {
  x: number;
  y: number;
  left: number;
  top: number;
};

const buttonClass =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";

function clampPage(
  value: number,
  totalPages: number | null,
) {
  const maximum =
    totalPages ?? Math.max(1, value);

  return Math.max(
    1,
    Math.min(maximum, value),
  );
}

export default function SmartBookViewer({
  pdfUrl,
  initialPage = 1,
  currentPage,
  onPageChange,
  onDocumentLoad,
  showFullscreen = true,
  className = "",
}: SmartBookViewerProps) {
  const shellRef =
    useRef<HTMLDivElement>(null);

  const viewportRef =
    useRef<HTMLDivElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const renderRef =
    useRef<RenderTask | null>(null);

  const [document, setDocument] =
    useState<PDFDocumentProxy | null>(null);

  const [internalPage, setInternalPage] =
    useState(initialPage);

  const [totalPages, setTotalPages] =
    useState<number | null>(null);

  const [zoom, setZoom] =
    useState(1);

  const [fitMode, setFitMode] =
    useState<FitMode>("PAGE");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [pan, setPan] =
    useState(false);

  const [drag, setDrag] =
    useState<DragState | null>(null);

  /*
   * null means the input should display the current
   * resolved page. A string means the user is actively
   * editing the field.
   *
   * This avoids synchronously calling setState from a
   * page-change useEffect.
   */
  const [inputDraft, setInputDraft] =
    useState<string | null>(null);

  const page = clampPage(
    currentPage ?? internalPage,
    totalPages,
  );

  const inputValue =
    inputDraft ?? String(page);

  function changePage(next: number) {
    const safe = clampPage(
      next,
      totalPages,
    );

    if (currentPage === undefined) {
      setInternalPage(safe);
    }

    setInputDraft(null);
    onPageChange?.(safe);
  }

  function commitPageInput() {
    const raw =
      inputDraft ?? String(page);

    const next = Number(raw);

    if (
      Number.isInteger(next) &&
      Number.isFinite(next)
    ) {
      changePage(next);
      return;
    }

    setInputDraft(null);
  }

  useEffect(() => {
    let disposed = false;
    let task:
      | PDFDocumentLoadingTask
      | null = null;

    void (async () => {
      try {
        const pdfjs =
          await import("pdfjs-dist");

        pdfjs.GlobalWorkerOptions.workerSrc =
          new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).toString();

        task = pdfjs.getDocument({
          url: pdfUrl,
          withCredentials: true,
        });

        const loaded =
          await task.promise;

        if (disposed) {
          return;
        }

        setDocument(loaded);
        setTotalPages(loaded.numPages);
        setError("");
        setLoading(false);

        const requestedPage =
          clampPage(
            currentPage ?? initialPage,
            loaded.numPages,
          );

        if (currentPage === undefined) {
          setInternalPage(requestedPage);
        }

        onPageChange?.(requestedPage);

        onDocumentLoad?.({
          totalPages: loaded.numPages,
        });
      } catch {
        if (!disposed) {
          setError(
            "The book file is not available yet.",
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      disposed = true;

      renderRef.current?.cancel();

      if (task) {
        void task.destroy();
      }
    };
  }, [
    pdfUrl,
    initialPage,
    currentPage,
    onDocumentLoad,
    onPageChange,
  ]);

  useEffect(() => {
    if (
      !document ||
      !canvasRef.current ||
      !viewportRef.current
    ) {
      return;
    }

    const activeDocument = document;
    const host = viewportRef.current;

    let cancelled = false;

    const observer =
      new ResizeObserver(() => {
        void render();
      });

    observer.observe(host);
    void render();

    async function render() {
      try {
        renderRef.current?.cancel();

        const source =
          await activeDocument.getPage(page);

        if (cancelled) {
          return;
        }

        const base =
          source.getViewport({
            scale: 1,
          });

        const availableWidth =
          Math.max(
            280,
            host.clientWidth - 32,
          );

        const availableHeight =
          Math.max(
            280,
            host.clientHeight - 32,
          );

        const scale =
          fitMode === "PAGE"
            ? Math.min(
                3,
                availableWidth /
                  base.width,
                availableHeight /
                  base.height,
              )
            : fitMode === "WIDTH"
              ? Math.min(
                  3,
                  availableWidth /
                    base.width,
                )
              : zoom;

        const viewport =
          source.getViewport({
            scale,
          });

        const canvas =
          canvasRef.current;

        if (!canvas) {
          return;
        }

        const context =
          canvas.getContext("2d");

        if (!context) {
          throw new Error(
            "Canvas unavailable.",
          );
        }

        const ratio =
          Math.min(
            window.devicePixelRatio ||
              1,
            2,
          );

        canvas.width =
          Math.floor(
            viewport.width * ratio,
          );

        canvas.height =
          Math.floor(
            viewport.height * ratio,
          );

        canvas.style.width =
          `${Math.floor(
            viewport.width,
          )}px`;

        canvas.style.height =
          `${Math.floor(
            viewport.height,
          )}px`;

        const renderTask =
          source.render({
            canvas,
            canvasContext: context,
            viewport,
            transform:
              ratio === 1
                ? undefined
                : [
                    ratio,
                    0,
                    0,
                    ratio,
                    0,
                    0,
                  ],
          });

        renderRef.current =
          renderTask;

        await renderTask.promise;

        if (!cancelled) {
          setError("");
        }

        source.cleanup();
      } catch (cause) {
        if (
          !cancelled &&
          !(
            cause instanceof Error &&
            cause.name ===
              "RenderingCancelledException"
          )
        ) {
          setError(
            "The book page could not be displayed.",
          );
        }
      }
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      renderRef.current?.cancel();
    };
  }, [
    document,
    page,
    zoom,
    fitMode,
  ]);

  return (
    <div
      ref={shellRef}
      className={`flex min-h-[65vh] flex-col overflow-hidden rounded-3xl border bg-slate-900 shadow-xl ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950 p-3 text-white">
        <button
          type="button"
          onClick={() =>
            setFitMode("PAGE")
          }
          className={buttonClass}
        >
          Fit Page
        </button>

        <button
          type="button"
          onClick={() =>
            setFitMode("WIDTH")
          }
          className={buttonClass}
        >
          Fit Width
        </button>

        <button
          type="button"
          onClick={() => {
            setFitMode(null);
            setZoom((value) =>
              Math.max(
                0.5,
                value - 0.2,
              ),
            );
          }}
          className={buttonClass}
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>

        <span className="min-w-14 text-center text-sm">
          {Math.round(
            (fitMode ? 1 : zoom) *
              100,
          )}
          %
        </span>

        <button
          type="button"
          onClick={() => {
            setFitMode(null);
            setZoom((value) =>
              Math.min(
                3,
                value + 0.2,
              ),
            );
          }}
          className={buttonClass}
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() =>
            setPan(
              (value) => !value,
            )
          }
          className={buttonClass}
          aria-pressed={pan}
        >
          <Hand className="h-4 w-4" />
          Pan
        </button>

        {showFullscreen ? (
          <button
            type="button"
            onClick={() =>
              void shellRef.current
                ?.requestFullscreen?.()
            }
            className={buttonClass}
            aria-label="Enter full screen"
          >
            <Expand className="h-4 w-4" />
          </button>
        ) : null}

        <span className="ml-auto" />

        <button
          type="button"
          onClick={() =>
            changePage(page - 1)
          }
          disabled={page <= 1}
          className={buttonClass}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <label className="flex items-center gap-1 text-sm">
          Page

          <input
            value={inputValue}
            onChange={(event) =>
              setInputDraft(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                commitPageInput();
              }

              if (
                event.key === "Escape"
              ) {
                setInputDraft(null);
              }
            }}
            onBlur={commitPageInput}
            inputMode="numeric"
            aria-label="Page number"
            className="w-16 rounded bg-white px-2 py-1 text-center text-slate-900"
          />

          <span>
            / {totalPages ?? "—"}
          </span>
        </label>

        <button
          type="button"
          onClick={() =>
            changePage(page + 1)
          }
          disabled={
            !totalPages ||
            page >= totalPages
          }
          className={buttonClass}
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={viewportRef}
        onPointerDown={(event) => {
          if (!pan) {
            return;
          }

          const viewport =
            viewportRef.current;

          if (!viewport) {
            return;
          }

          setDrag({
            x: event.clientX,
            y: event.clientY,
            left:
              viewport.scrollLeft,
            top:
              viewport.scrollTop,
          });
        }}
        onPointerMove={(event) => {
          if (!drag) {
            return;
          }

          const viewport =
            viewportRef.current;

          if (!viewport) {
            return;
          }

          viewport.scrollLeft =
            drag.left -
            (event.clientX -
              drag.x);

          viewport.scrollTop =
            drag.top -
            (event.clientY -
              drag.y);
        }}
        onPointerUp={() =>
          setDrag(null)
        }
        onPointerCancel={() =>
          setDrag(null)
        }
        onPointerLeave={() =>
          setDrag(null)
        }
        className={`flex flex-1 overflow-auto bg-slate-800 p-4 ${
          pan
            ? drag
              ? "cursor-grabbing"
              : "cursor-grab"
            : ""
        }`}
      >
        <div className="m-auto">
          {loading ? (
            <p className="p-10 text-white">
              Loading book...
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded bg-white p-6 text-red-700"
            >
              {error}
            </p>
          ) : (
            <canvas
              ref={canvasRef}
              className={
                loading
                  ? "hidden"
                  : "block bg-white shadow-2xl"
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}