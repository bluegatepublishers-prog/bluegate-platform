"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Expand,
  Maximize2,
  Minus,
  Plus,
} from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";

export default function StudentPdfReader({
  bookId,
  title,
  subjectPath,
  initialPage,
  initialTotalPages,
  initialBookmarks,
}: {
  bookId: string;
  title: string;
  subjectPath: string;
  initialPage: number;
  initialTotalPages: number | null;
  initialBookmarks: number[];
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveMessage, setSaveMessage] = useState("");
  const [bookmarks, setBookmarks] = useState(new Set(initialBookmarks));

  useEffect(() => {
    let disposed = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    void (async () => {
      try {
        setLoading(true);
        setError("");
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        loadingTask = pdfjs.getDocument({
          url: `/api/books/${bookId}/full-pdf`,
          withCredentials: true,
        });
        const loaded = await loadingTask.promise;
        if (disposed) return;
        setDocument(loaded);
        setTotalPages(loaded.numPages);
        setPage((current) => Math.min(Math.max(1, current), loaded!.numPages));
        setLoading(false);
      } catch (cause) {
        if (!disposed) {
          const status = typeof cause === "object" && cause && "status" in cause ? Number(cause.status) : null;
          setError(status === 401 || status === 403
            ? "You do not have access to this book file."
            : status === 404
              ? "The book file is not available yet."
              : "The secure file link expired or the book is temporarily unavailable.");
          setLoading(false);
        }
      }
    })();
    return () => {
      disposed = true;
      renderTaskRef.current?.cancel();
      if (loadingTask) void loadingTask.destroy();
    };
  }, [bookId, loadAttempt]);

  useEffect(() => {
    if (!document || !canvasRef.current || !viewportRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        renderTaskRef.current?.cancel();
        const pdfPage = await document.getPage(page);
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const available = Math.max(280, viewportRef.current!.clientWidth - 32);
        const scale = fitWidth ? Math.min(3, available / base.width) : zoom;
        const viewport = pdfPage.getViewport({ scale });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current!;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const task = pdfPage.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        renderTaskRef.current = task;
        await task.promise;
      } catch (cause) {
        if (!cancelled && !(cause instanceof Error && cause.name === "RenderingCancelledException")) {
          setError("The book page could not be displayed.");
        }
      }
    })();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [document, fitWidth, page, zoom]);

  const saveProgress = useCallback(async () => {
    if (!document || !totalPages) return;
    try {
      const response = await fetch(`/api/student/books/${bookId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPage: page, totalPages }),
      });
      if (!response.ok) throw new Error("save failed");
      setSaveMessage("Reading position saved");
    } catch {
      setSaveMessage("We could not save your reading position.");
    }
  }, [bookId, document, page, totalPages]);

  useEffect(() => {
    if (!document) return;
    const timer = window.setTimeout(() => void saveProgress(), 1200);
    return () => window.clearTimeout(timer);
  }, [document, page, saveProgress]);

  async function toggleBookmark() {
    try {
      const response = await fetch(`/api/student/books/${bookId}/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageNumber: page, totalPages }),
      });
      const result = await response.json() as { ok?: boolean; bookmarked?: boolean };
      if (!response.ok || !result.ok) throw new Error("bookmark failed");
      setBookmarks((current) => {
        const next = new Set(current);
        if (result.bookmarked) next.add(page);
        else next.delete(page);
        return next;
      });
    } catch {
      setSaveMessage("We could not save this page bookmark.");
    }
  }

  async function enterFullscreen() {
    if (shellRef.current?.requestFullscreen) await shellRef.current.requestFullscreen();
  }

  const previous = () => setPage((current) => Math.max(1, current - 1));
  const next = () => setPage((current) => Math.min(totalPages ?? current, current + 1));
  const bookmarked = bookmarks.has(page);
  return (
    <div ref={shellRef} className="flex min-h-[75vh] flex-col overflow-hidden rounded-3xl border bg-slate-900 shadow-xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950 p-3 text-white">
        <Link href="/student-dashboard/books" className="mr-auto rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">← My Books</Link>
        <Link href={subjectPath} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">Back to Subject</Link>
        <button type="button" onClick={previous} disabled={page <= 1} aria-label="Previous page" className={buttonClass}><ChevronLeft className="h-5 w-5" /></button>
        <label className="flex min-h-11 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm"><span>Page</span><input aria-label="Current page" type="number" min={1} max={totalPages ?? undefined} value={page} onChange={(event) => setPage(Math.min(totalPages ?? 100000, Math.max(1, Number(event.target.value) || 1)))} className="w-16 rounded bg-white px-2 py-1 text-center text-slate-900" /><span>of {totalPages ?? "—"}</span></label>
        <button type="button" onClick={next} disabled={!totalPages || page >= totalPages} aria-label="Next page" className={buttonClass}><ChevronRight className="h-5 w-5" /></button>
        <button type="button" onClick={() => { setFitWidth(false); setZoom((value) => Math.max(0.5, value - 0.2)); }} aria-label="Zoom out" className={buttonClass}><Minus className="h-5 w-5" /></button>
        <span className="min-w-14 text-center text-sm">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => { setFitWidth(false); setZoom((value) => Math.min(3, value + 0.2)); }} aria-label="Zoom in" className={buttonClass}><Plus className="h-5 w-5" /></button>
        <button type="button" onClick={() => setFitWidth(true)} aria-label="Fit page to width" aria-pressed={fitWidth} className={buttonClass}><Maximize2 className="h-5 w-5" /></button>
        <button type="button" onClick={() => void toggleBookmark()} aria-label={bookmarked ? "Remove page bookmark" : "Bookmark this page"} aria-pressed={bookmarked} className={buttonClass}>{bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}</button>
        <button type="button" onClick={() => void enterFullscreen()} aria-label="Enter full screen" className={buttonClass}><Expand className="h-5 w-5" /></button>
      </div>
      <div className="border-b border-white/10 bg-slate-900 px-4 py-2 text-center text-sm text-slate-300"><span className="font-semibold text-white">{title}</span>{saveMessage && <span aria-live="polite" className="ml-3">· {saveMessage}</span>}</div>
      {bookmarks.size > 0 && <div className="flex gap-2 overflow-x-auto border-b border-white/10 bg-slate-950 px-4 py-2 text-white"><span className="shrink-0 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">Bookmarks</span>{[...bookmarks].sort((a, b) => a - b).map((item) => <button key={item} type="button" onClick={() => setPage(item)} className="min-h-9 shrink-0 rounded-lg bg-white/10 px-3 text-sm hover:bg-white/20">Page {item}</button>)}</div>}
      <div ref={viewportRef} className="flex flex-1 overflow-auto bg-slate-800 p-4">
        <div className="m-auto">
          {loading && <p className="p-10 text-center text-white">Loading book…</p>}
          {error ? <div role="alert" className="max-w-lg rounded-2xl bg-white p-8 text-center text-red-700"><p>{error}</p><button type="button" onClick={() => setLoadAttempt((value) => value + 1)} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">Try again</button></div> : <canvas ref={canvasRef} aria-label={`${title}, page ${page}`} className={loading ? "hidden" : "block bg-white shadow-2xl"} />}
        </div>
      </div>
    </div>
  );
}

const buttonClass = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-white/10 p-2 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40";
