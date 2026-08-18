"use client";

import type {
  ReactNode,
} from "react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  PDFPageProxy,
  RenderTask,
} from "pdfjs-dist";

export type SmartBookViewerProps = {
  pdfUrl: string;

  initialPage?: number;

  currentPage?: number;

  onPageChange?: (
    page: number,
  ) => void;

  onDocumentLoad?: (info: {
    totalPages: number;
  }) => void;

  showFullscreen?: boolean;

  minimalControls?: boolean;

  pageOverlay?: ReactNode;

  renderPageOverlay?: (
    page: number,
  ) => ReactNode;

  spreadMode?:
    | "SINGLE"
    | "DOUBLE"
    | "AUTO";

  /*
   * Optional allowed page range.
   *
   * Normal full-book reader:
   * minPage = 1
   * maxPage = total PDF pages
   *
   * Planner example:
   * minPage = module.startPage
   * maxPage = module.endPage
   */
  minPage?: number;

  maxPage?: number;

  className?: string;
};

type FitMode =
  | "PAGE"
  | "WIDTH"
  | null;

type DragState = {
  x: number;
  y: number;
  left: number;
  top: number;
};

type ActiveRender = {
  page: PDFPageProxy;
  task: RenderTask;
};

const buttonClass =
  "inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";

function resolveMinimum(
  minPage: number | undefined,
) {
  return typeof minPage === "number" &&
    Number.isInteger(minPage)
    ? Math.max(
        1,
        minPage,
      )
    : 1;
}

function resolveMaximum(
  totalPages: number | null,
  minimum: number,
  maxPage: number | undefined,
) {
  if (!totalPages) {
    if (
      typeof maxPage ===
        "number" &&
      Number.isInteger(
        maxPage,
      )
    ) {
      return Math.max(
        minimum,
        maxPage,
      );
    }

    return null;
  }

  if (
    typeof maxPage ===
      "number" &&
    Number.isInteger(
      maxPage,
    )
  ) {
    return Math.min(
      totalPages,
      Math.max(
        minimum,
        maxPage,
      ),
    );
  }

  return totalPages;
}

function clampPage(
  value: number,
  minimum: number,
  maximum: number | null,
) {
  const upper =
    maximum ??
    Math.max(
      minimum,
      value,
    );

  return Math.max(
    minimum,
    Math.min(
      upper,
      value,
    ),
  );
}

/*
 * Spread grouping.
 *
 * Full book:
 *
 * page 1
 * pages 2-3
 * pages 4-5
 *
 * Restricted range example 47-54:
 *
 * pages 47-48
 * pages 49-50
 * pages 51-52
 * pages 53-54
 */
function getSpreadStart(
  page: number,
  minimum: number,
) {
  if (
    minimum === 1 &&
    page <= 1
  ) {
    return 1;
  }

  if (minimum === 1) {
    return page % 2 === 0
      ? page
      : page - 1;
  }

  const offset =
    Math.max(
      0,
      page - minimum,
    );

  return (
    minimum +
    Math.floor(
      offset / 2,
    ) *
      2
  );
}

export default function SmartBookViewer({
  pdfUrl,
  initialPage = 1,
  currentPage,
  onPageChange,
  onDocumentLoad,
  showFullscreen = true,
  minimalControls = false,
  pageOverlay,
  renderPageOverlay,
  spreadMode = "SINGLE",
  minPage = 1,
  maxPage,
  className = "",
}: SmartBookViewerProps) {
  const shellRef =
    useRef<HTMLDivElement>(null);

  const viewportRef =
    useRef<HTMLDivElement>(null);

  const leftCanvasRef =
    useRef<HTMLCanvasElement>(null);

  const rightCanvasRef =
    useRef<HTMLCanvasElement>(null);

  const loadingTaskRef =
    useRef<
      PDFDocumentLoadingTask | null
    >(null);

  const activeRendersRef =
    useRef<ActiveRender[]>(
      [],
    );

  const [document, setDocument] =
    useState<PDFDocumentProxy | null>(
      null,
    );

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
    useState<DragState | null>(
      null,
    );

  const [inputDraft, setInputDraft] =
    useState<string | null>(
      null,
    );

  const [wideScreen, setWideScreen] =
    useState(false);

  const minimum =
    resolveMinimum(minPage);

  const maximum =
    resolveMaximum(
      totalPages,
      minimum,
      maxPage,
    );

  const page =
    clampPage(
      currentPage ??
        internalPage,
      minimum,
      maximum,
    );

  /*
   * DOUBLE remains responsive:
   * if the viewport is too narrow, show one page.
   *
   * This prevents an unusably small two-page spread
   * on phones.
   */
  const useSpread =
    spreadMode === "DOUBLE"
      ? wideScreen
      : spreadMode === "AUTO"
        ? wideScreen
        : false;

  const spreadStart =
    useSpread
      ? getSpreadStart(
          page,
          minimum,
        )
      : page;

  const leftPage =
    clampPage(
      spreadStart,
      minimum,
      maximum,
    );

  const rightPage =
  useSpread &&
  maximum !== null &&
  /*
   * Physical book rule:
   * absolute PDF page 1 is the front cover
   * and must always display by itself.
   *
   * After the cover:
   * 2 + 3
   * 4 + 5
   * 6 + 7
   * ...
   *
   * For a restricted Planner range whose
   * minimum is not page 1, the range may
   * begin as a normal two-page spread.
   */
  !(minimum === 1 && leftPage === 1) &&
  leftPage + 1 <= maximum
    ? leftPage + 1
    : null;

  const inputValue =
    inputDraft ??
    String(page);

  /*
   * Screen-width detection for spread display.
   */
  useEffect(() => {
    const media =
      window.matchMedia(
        "(min-width: 1100px)",
      );

    const update = () => {
      setWideScreen(
        media.matches,
      );
    };

    update();

    media.addEventListener(
      "change",
      update,
    );

    return () => {
      media.removeEventListener(
        "change",
        update,
      );
    };
  }, []);

  function changePage(
    next: number,
  ) {
    const safe =
      clampPage(
        next,
        minimum,
        maximum,
      );

    if (
      currentPage === undefined
    ) {
      setInternalPage(
        safe,
      );
    }

    setInputDraft(null);

    onPageChange?.(
      safe,
    );
  }

  function goPrevious() {
    if (!useSpread) {
      changePage(
        page - 1,
      );

      return;
    }

    if (
      spreadStart <=
      minimum
    ) {
      return;
    }

    if (
      minimum === 1 &&
      spreadStart === 2
    ) {
      changePage(1);

      return;
    }

    changePage(
      Math.max(
        minimum,
        spreadStart - 2,
      ),
    );
  }

  function goNext() {
    if (!maximum) {
      return;
    }

    if (!useSpread) {
      changePage(
        page + 1,
      );

      return;
    }

    if (
      minimum === 1 &&
      spreadStart === 1
    ) {
      changePage(
        Math.min(
          2,
          maximum,
        ),
      );

      return;
    }

    changePage(
      Math.min(
        maximum,
        spreadStart + 2,
      ),
    );
  }

  function commitPageInput() {
    const raw =
      inputDraft ??
      String(page);

    const next =
      Number(raw);

    if (
      Number.isInteger(next) &&
      Number.isFinite(next)
    ) {
      changePage(next);

      return;
    }

    setInputDraft(null);
  }

  function cancelActiveRenders() {
    const active =
      activeRendersRef.current;

    activeRendersRef.current =
      [];

    for (const render of active) {
      try {
        render.task.cancel();
      } catch {
        // Best-effort render cancellation.
      }

      try {
        render.page.cleanup();
      } catch {
        // Best-effort PDF page cleanup.
      }
    }
  }

  /*
   * Load the PDF ONCE.
   *
   * Page navigation does not reload the full PDF.
   */
  useEffect(() => {
    let disposed =
      false;

    void (async () => {
      try {
        setLoading(true);
        setError("");

        const pdfjs =
          await import(
            "pdfjs-dist"
          );

        pdfjs.GlobalWorkerOptions.workerSrc =
          new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).toString();

        const task =
          pdfjs.getDocument({
            url: pdfUrl,
            withCredentials: true,
          });

        loadingTaskRef.current =
          task;

        const loaded =
          await task.promise;

        if (disposed) {
          void task.destroy();

          return;
        }

        setDocument(
          loaded,
        );

        setTotalPages(
          loaded.numPages,
        );

        setLoading(false);

        const finalMaximum =
          resolveMaximum(
            loaded.numPages,
            minimum,
            maxPage,
          );

        const requestedPage =
          clampPage(
            currentPage ??
              initialPage,
            minimum,
            finalMaximum,
          );

        if (
          currentPage === undefined
        ) {
          setInternalPage(
            requestedPage,
          );
        }

        onPageChange?.(
          requestedPage,
        );

        onDocumentLoad?.({
          totalPages:
            loaded.numPages,
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

      cancelActiveRenders();

      const task =
        loadingTaskRef.current;

      loadingTaskRef.current =
        null;

      if (task) {
        void task.destroy();
      }
    };

    /*
     * PDF loading intentionally depends only
     * on the PDF URL.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl]);

  /*
   * Render the active single page or two-page spread.
   */
  useEffect(() => {
    if (
      !document ||
      !viewportRef.current
    ) {
      return;
    }

    const host =
      viewportRef.current;

    let disposed =
      false;

    let generation =
      0;

    const renderCurrent =
      async () => {
        const run =
          ++generation;

        cancelActiveRenders();

        try {
          const requested: Array<{
            pageNumber: number;
            canvas:
              | HTMLCanvasElement
              | null;
          }> = [
            {
              pageNumber:
                leftPage,

              canvas:
                leftCanvasRef.current,
            },
          ];

          if (
            rightPage !== null
          ) {
            requested.push({
              pageNumber:
                rightPage,

              canvas:
                rightCanvasRef.current,
            });
          }

          const availableWidth =
            Math.max(
              320,
              host.clientWidth -
                24,
            );

          const availableHeight =
            Math.max(
              320,
              host.clientHeight -
                24,
            );

          const pageCount =
            requested.length;

          const gap =
            pageCount === 2
              ? 12
              : 0;

          const widthPerPage =
            pageCount === 2
              ? (availableWidth -
                  gap) /
                2
              : availableWidth;

          const prepared: Array<{
            source: PDFPageProxy;
            canvas: HTMLCanvasElement;
            scale: number;
          }> = [];

          for (const item of requested) {
            if (!item.canvas) {
              continue;
            }

            const source =
              await document.getPage(
                item.pageNumber,
              );

            if (
              disposed ||
              run !== generation
            ) {
              source.cleanup();

              return;
            }

            const base =
              source.getViewport({
                scale: 1,
              });

            const scale =
              fitMode ===
              "PAGE"
                ? Math.min(
                    3,

                    widthPerPage /
                      base.width,

                    availableHeight /
                      base.height,
                  )
                : fitMode ===
                    "WIDTH"
                  ? Math.min(
                      3,

                      widthPerPage /
                        base.width,
                    )
                  : zoom;

            prepared.push({
              source,

              canvas:
                item.canvas,

              scale,
            });
          }

          for (const item of prepared) {
            if (
              disposed ||
              run !== generation
            ) {
              item.source.cleanup();

              return;
            }

            const viewport =
              item.source.getViewport({
                scale:
                  item.scale,
              });

            const context =
              item.canvas.getContext(
                "2d",
              );

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

            item.canvas.width =
              Math.floor(
                viewport.width *
                  ratio,
              );

            item.canvas.height =
              Math.floor(
                viewport.height *
                  ratio,
              );

            item.canvas.style.width =
              `${Math.floor(
                viewport.width,
              )}px`;

            item.canvas.style.height =
              `${Math.floor(
                viewport.height,
              )}px`;

            const task =
              item.source.render({
                canvas:
                  item.canvas,

                canvasContext:
                  context,

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

            activeRendersRef.current.push(
              {
                page:
                  item.source,

                task,
              },
            );
          }

          await Promise.all(
            activeRendersRef.current.map(
              (item) =>
                item.task.promise,
            ),
          );

          if (
            !disposed &&
            run === generation
          ) {
            setError("");
          }
        } catch (cause) {
          if (
            !disposed &&
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
      };

    const observer =
      new ResizeObserver(
        () => {
          void renderCurrent();
        },
      );

    observer.observe(
      host,
    );

    void renderCurrent();

    return () => {
      disposed = true;

      generation += 1;

      observer.disconnect();

      cancelActiveRenders();
    };
  }, [
    document,
    leftPage,
    rightPage,
    fitMode,
    zoom,
  ]);

  const pageLabel =
    useMemo(() => {
      if (!maximum) {
        return "—";
      }

      if (
        useSpread &&
        rightPage !== null
      ) {
        return `${leftPage}-${rightPage} / ${maximum}`;
      }

      return `${leftPage} / ${maximum}`;
    }, [
      leftPage,
      maximum,
      rightPage,
      useSpread,
    ]);

  const previousDisabled =
    useSpread
      ? spreadStart <=
        minimum
      : page <= minimum;

  const nextDisabled =
    !maximum ||
    (useSpread
      ? rightPage !== null
        ? rightPage >=
          maximum
        : leftPage >=
          maximum
      : page >= maximum);

  return (
    <div
      ref={shellRef}
      className={`flex h-full min-h-0 flex-col overflow-hidden bg-slate-900 ${className}`}
    >
      {/* Page navigation */}
      <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950 px-2 py-2 text-white sm:px-4">
        {!minimalControls ? (
          <>
            <button
              type="button"
              onClick={() =>
                setFitMode(
                  "PAGE",
                )
              }
              className={
                buttonClass
              }
            >
              Fit Page
            </button>

            <button
              type="button"
              onClick={() =>
                setFitMode(
                  "WIDTH",
                )
              }
              className={
                buttonClass
              }
            >
              Fit Width
            </button>

            <button
              type="button"
              onClick={() => {
                setFitMode(null);

                setZoom(
                  (value) =>
                    Math.max(
                      0.5,
                      value -
                        0.2,
                    ),
                );
              }}
              className={
                buttonClass
              }
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>

            <span className="min-w-14 text-center text-sm">
              {Math.round(
                (fitMode
                  ? 1
                  : zoom) *
                  100,
              )}
              %
            </span>

            <button
              type="button"
              onClick={() => {
                setFitMode(null);

                setZoom(
                  (value) =>
                    Math.min(
                      3,
                      value +
                        0.2,
                    ),
                );
              }}
              className={
                buttonClass
              }
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setPan(
                  (value) =>
                    !value,
                )
              }
              className={
                buttonClass
              }
              aria-pressed={pan}
            >
              <Hand className="h-4 w-4" />
              Pan
            </button>
          </>
        ) : null}

        {!minimalControls &&
        showFullscreen ? (
          <button
            type="button"
            onClick={() =>
              void shellRef.current
                ?.requestFullscreen?.()
            }
            className={
              buttonClass
            }
            aria-label="Enter full screen"
          >
            <Expand className="h-4 w-4" />
          </button>
        ) : null}

        <span className="ml-auto" />

        <button
          type="button"
          onClick={
            goPrevious
          }
          disabled={
            previousDisabled
          }
          className={
            buttonClass
          }
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <label className="hidden items-center gap-1 text-sm sm:flex">
          Page

          <input
            value={inputValue}
            onChange={(event) =>
              setInputDraft(
                event.target.value,
              )
            }
            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                "Enter"
              ) {
                commitPageInput();
              }

              if (
                event.key ===
                "Escape"
              ) {
                setInputDraft(
                  null,
                );
              }
            }}
            onBlur={
              commitPageInput
            }
            inputMode="numeric"
            aria-label="Page number"
            className="w-16 rounded-lg bg-white px-2 py-1.5 text-center text-slate-900"
          />

          <span>
            / {maximum ?? "—"}
          </span>
        </label>

        <span className="min-w-[105px] text-center text-sm font-semibold sm:hidden">
          {pageLabel}
        </span>

        <button
          type="button"
          onClick={goNext}
          disabled={
            nextDisabled
          }
          className={
            buttonClass
          }
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Full book viewport */}
      <div
        ref={viewportRef}
        onPointerDown={(
          event,
        ) => {
          if (!pan) {
            return;
          }

          const viewport =
            viewportRef.current;

          if (!viewport) {
            return;
          }

          setDrag({
            x:
              event.clientX,

            y:
              event.clientY,

            left:
              viewport.scrollLeft,

            top:
              viewport.scrollTop,
          });
        }}
        onPointerMove={(
          event,
        ) => {
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
        className={`flex min-h-0 flex-1 overflow-auto bg-slate-800 p-2 sm:p-3 ${
          pan
            ? drag
              ? "cursor-grabbing"
              : "cursor-grab"
            : ""
        }`}
      >
        <div className="relative m-auto flex items-center justify-center gap-3">
          {loading ? (
            <p className="p-10 text-white">
              Loading book...
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-white p-6 text-red-700"
            >
              {error}
            </p>
          ) : null}

          {!loading &&
          !error ? (
            <>
              {/* Single/left page */}
              <div className="relative shrink-0 overflow-hidden bg-white shadow-2xl">
                <canvas
                  ref={
                    leftCanvasRef
                  }
                  className="block bg-white"
                />

                <div className="pointer-events-auto absolute inset-0">
                  {renderPageOverlay
                    ? renderPageOverlay(
                        leftPage,
                      )
                    : pageOverlay}
                </div>
              </div>

              {/* Right page */}
              {rightPage !==
              null ? (
                <div className="relative shrink-0 overflow-hidden bg-white shadow-2xl">
                  <canvas
                    ref={
                      rightCanvasRef
                    }
                    className="block bg-white"
                  />

                  <div className="pointer-events-auto absolute inset-0">
                    {renderPageOverlay?.(
                      rightPage,
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}