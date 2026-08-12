"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";

type Props = { pdfUrl: string; pageNumber: number; pageWidth: number; pageHeight: number; active: boolean };
export default function PdfPageBackground({ pdfUrl, pageNumber, pageWidth, pageHeight, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null); const taskRef = useRef<RenderTask | null>(null); const [error, setError] = useState(false);
  useEffect(() => { if (!active || !canvasRef.current) return; let cancelled = false; let loading: PDFDocumentLoadingTask | null = null; void (async () => { try { const pdfjs = await import("pdfjs-dist"); pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString(); loading = pdfjs.getDocument({ url: pdfUrl, withCredentials: true }); const document = await loading.promise; const page = await document.getPage(pageNumber); if (cancelled || !canvasRef.current) return; const base = page.getViewport({ scale: 1 }); const scale = Math.min(pageWidth / base.width, pageHeight / base.height); const viewport = page.getViewport({ scale }); const canvas = canvasRef.current; const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas unavailable"); canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height); const task = page.render({ canvas, canvasContext: context, viewport }); taskRef.current = task; await task.promise; page.cleanup(); document.cleanup(); } catch { if (!cancelled) setError(true); } })(); return () => { cancelled = true; taskRef.current?.cancel(); if (loading) void loading.destroy(); }; }, [active, pageHeight, pageNumber, pageWidth, pdfUrl]);
  if (!active) return <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-slate-100" />;
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-white">{error ? <span className="text-xs text-slate-400">PDF page unavailable</span> : <canvas ref={canvasRef} className="h-full w-full object-contain" />}</div>;
}