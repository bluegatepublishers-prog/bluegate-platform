"use client";

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";

interface PublicSamplePdfViewerProps {
  pdfUrl: string;
  title: string;
  className?: string;
}

export default function PublicSamplePdfViewer({
  pdfUrl,
  title,
  className = "",
}: PublicSamplePdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef =
    useRef<PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const renderSequenceRef = useRef(0);
  const touchStartXRef = useRef<number | null>(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingDocument, setLoadingDocument] =
    useState(true);
  const [renderingPage, setRenderingPage] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({
    width: 0,
    height: 0,
  });

  const goPrevious = useCallback(() => {
    setPageNumber((current) => Math.max(1, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setPageNumber((current) =>
      totalPages
        ? Math.min(totalPages, current + 1)
        : current,
    );
  }, [totalPages]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();

      setViewportSize({
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height),
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    setLoadingDocument(true);
    setError(null);
    setTotalPages(0);
    setPageNumber(1);

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");

        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          withCredentials: false,
        });

        loadingTaskRef.current = loadingTask;

        const document = await loadingTask.promise;

        if (cancelled) {
          await loadingTask.destroy();
          return;
        }

        documentRef.current = document;
        setTotalPages(document.numPages);
      } catch (loadError) {
        if (cancelled) return;

        console.error(
          "Unable to load public sample PDF:",
          loadError,
        );

        setError(
          "The sample preview could not be loaded. Please try again.",
        );
      } finally {
        if (!cancelled) {
          setLoadingDocument(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderSequenceRef.current += 1;

      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;

      documentRef.current = null;

      const loadingTask = loadingTaskRef.current;
      loadingTaskRef.current = null;

      if (loadingTask) {
        void loadingTask.destroy();
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    const document = documentRef.current;
    const canvas = canvasRef.current;

    if (
      !document ||
      !canvas ||
      !totalPages ||
      viewportSize.width <= 0 ||
      viewportSize.height <= 0
    ) {
      return;
    }

    const sequence = ++renderSequenceRef.current;
    let cancelled = false;

    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;

    setRenderingPage(true);
    setError(null);

    void (async () => {
      try {
        const page = await document.getPage(pageNumber);

        if (
          cancelled ||
          sequence !== renderSequenceRef.current
        ) {
          page.cleanup();
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });

        /*
         * Fit the COMPLETE PDF page into the available
         * viewer area. This intentionally uses both width
         * and height, unlike FitH/FitWidth.
         */
        const availableWidth = Math.max(
          1,
          viewportSize.width - 16,
        );
        const availableHeight = Math.max(
          1,
          viewportSize.height - 16,
        );

        const scale = Math.min(
          availableWidth / baseViewport.width,
          availableHeight / baseViewport.height,
        );

        const viewport = page.getViewport({
          scale: Math.max(scale, 0.01),
        });

        const outputScale = Math.min(
          window.devicePixelRatio || 1,
          2,
        );

        const context = canvas.getContext("2d", {
          alpha: false,
        });

        if (!context) {
          throw new Error("Canvas is unavailable.");
        }

        canvas.width = Math.max(
          1,
          Math.floor(viewport.width * outputScale),
        );
        canvas.height = Math.max(
          1,
          Math.floor(viewport.height * outputScale),
        );

        canvas.style.width = `${Math.floor(
          viewport.width,
        )}px`;
        canvas.style.height = `${Math.floor(
          viewport.height,
        )}px`;

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform:
            outputScale === 1
              ? undefined
              : [outputScale, 0, 0, outputScale, 0, 0],
        });

        renderTaskRef.current = renderTask;

        await renderTask.promise;

        if (
          cancelled ||
          sequence !== renderSequenceRef.current
        ) {
          return;
        }

        page.cleanup();
      } catch (renderError) {
        const maybeError = renderError as {
          name?: string;
        };

        if (
          cancelled ||
          maybeError?.name === "RenderingCancelledException"
        ) {
          return;
        }

        console.error(
          "Unable to render public sample PDF page:",
          renderError,
        );

        setError(
          "This sample page could not be displayed. Please try again.",
        );
      } finally {
        if (
          !cancelled &&
          sequence === renderSequenceRef.current
        ) {
          setRenderingPage(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [
    pageNumber,
    totalPages,
    viewportSize.height,
    viewportSize.width,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goPrevious();
      }

      if (event.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
  }, [goNext, goPrevious]);

  const handleTouchStart = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    touchStartXRef.current =
      event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;

    touchStartXRef.current = null;

    if (startX == null || endX == null) return;

    const distance = endX - startX;

    if (Math.abs(distance) < 50) return;

    if (distance > 0) {
      goPrevious();
    } else {
      goNext();
    }
  };

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-100 ${className}`}
      onContextMenu={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
    >
      <div
        ref={viewportRef}
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center overflow-hidden p-2 sm:p-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          aria-label={`${title}, sample page ${pageNumber}`}
          className={`max-h-full max-w-full bg-white shadow-lg ring-1 ring-slate-200 transition-opacity ${
            loadingDocument || renderingPage || error
              ? "opacity-0"
              : "opacity-100"
          }`}
        />

        {(loadingDocument || renderingPage) && !error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-6 py-5 shadow-lg">
              <Loader2
                className="animate-spin text-blue-600"
                size={30}
              />
              <p className="text-sm font-medium text-slate-600">
                {loadingDocument
                  ? "Loading sample..."
                  : `Loading page ${pageNumber}...`}
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-lg">
              <Maximize2
                className="mx-auto text-slate-300"
                size={42}
              />
              <p className="mt-4 font-semibold text-slate-800">
                Preview unavailable
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {error}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2.5 sm:px-5 sm:py-3">
        <button
          type="button"
          onClick={goPrevious}
          disabled={
            loadingDocument ||
            Boolean(error) ||
            pageNumber <= 1
          }
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
        >
          <ChevronLeft size={20} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="min-w-0 text-center">
          <p className="whitespace-nowrap text-sm font-semibold text-slate-700">
            {totalPages
              ? `Page ${pageNumber} of ${totalPages}`
              : "Sample Preview"}
          </p>

          <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">
            Use Previous / Next or arrow keys
          </p>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={
            loadingDocument ||
            Boolean(error) ||
            !totalPages ||
            pageNumber >= totalPages
          }
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-5"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}