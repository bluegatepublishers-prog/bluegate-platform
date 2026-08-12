"use client";

import { useMemo, useState } from "react";

import V2ContentDocumentRenderer from "@/components/content/V2ContentDocumentRenderer";
import type { ContentDocument } from "@/lib/content-document";
import { getContentLayoutVersion, setV2PageVisualMode, type LayoutV2VisualMode } from "@/lib/content-layout-v2";
import type { IdmlAnalysis, IdmlDiagnostic } from "@/lib/idml-import";

type AnalysisResponse = {
  analysis: Omit<IdmlAnalysis, "intermediate">;
  currentContentHash: string;
  hasExistingV2: boolean;
};

type PageModes = Record<string, LayoutV2VisualMode>;
type IdmlXmlFailure = { entryPath: string; fileName: string; problem: string; line?: number; column?: number };
type IdmlSizeFailure = { category: "OUTER_PACKAGE" | "NESTED_IDML" | "INTERNAL_XML" | "LINKED_ASSET" | "STORY_TEXT"; entryPath: string; fileName: string; problem: string; allowedBytes: number; detectedBytes?: number };

export default function IdmlImportPanel({ bookId, nodeId, nodeType, currentDocument, open = false, onClose }: { bookId: string; nodeId: string; nodeType: string; currentDocument: ContentDocument; open?: boolean; onClose?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [pageModes, setPageModes] = useState<PageModes>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [mode, setMode] = useState<"REPLACE" | "APPEND">("REPLACE");
  const [semanticOverlay, setSemanticOverlay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [xmlFailure, setXmlFailure] = useState<IdmlXmlFailure | null>(null);
  const [sizeFailure, setSizeFailure] = useState<IdmlSizeFailure | null>(null);
  const existingV2 = analysis?.hasExistingV2 ?? getContentLayoutVersion(currentDocument) === 2;
  const pageCount = analysis?.analysis.document.pageLayout?.pages.length ?? 0;
  const previewDocument = useMemo(() => {
    if (!analysis?.analysis.document.pageLayout) return null;
    const page = analysis.analysis.document.pageLayout.pages[pageIndex];
    if (!page) return null;
    const selectedMode = pageModes[page.id];
    const document = selectedMode && selectedMode !== (page.visualMode ?? "EDITABLE")
      ? { ...analysis.analysis.document, pageLayout: setV2PageVisualMode(analysis.analysis.document.pageLayout, page.id, selectedMode) }
      : analysis.analysis.document;
    return { ...document, pageLayout: { ...document.pageLayout!, pages: [document.pageLayout!.pages.find((entry) => entry.id === page.id) ?? page] } };
  }, [analysis, pageIndex, pageModes]);

  async function analyze() {
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".indd")) {
      setError("Please export/package the document with IDML and linked assets.");
      return;
    }
    setBusy(true);
    setError("");
    setXmlFailure(null);
    setSizeFailure(null);
    setMessage("");
    try {
      const form = new FormData();
      form.set("action", "analyze");
      form.set("bookId", bookId);
      form.set("nodeId", nodeId);
      form.set("nodeType", nodeType);
      form.set("package", file);
      const response = await fetch("/api/admin/content/import/idml", { method: "POST", body: form });
      const body = await response.json() as { ok?: boolean; message?: string; idmlXmlError?: IdmlXmlFailure; idmlSizeError?: IdmlSizeFailure } & Partial<AnalysisResponse>;
      if (!response.ok || !body.ok || !body.analysis || !body.currentContentHash) { setXmlFailure(body.idmlXmlError ?? null); setSizeFailure(body.idmlSizeError ?? null); throw new Error(body.message || "Unable to analyze the IDML package."); }
      setAnalysis({ analysis: body.analysis, currentContentHash: body.currentContentHash, hasExistingV2: Boolean(body.hasExistingV2) });
      setPageModes(Object.fromEntries(body.analysis.pageRecommendations.map((page) => [page.pageId, page.referenceAvailable && page.recommendation === "EXACT_REPLICA" ? "EXACT_REPLICA" : "EDITABLE"])));
      setPageIndex(0);
      setMode("REPLACE");
      setSemanticOverlay(false);
      setMessage("Analysis complete. Review recommendations and preview the imported pages before confirming.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze the package.");
      setAnalysis(null);
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!file || !analysis) return;
    const exactUnavailable = analysis.analysis.pageRecommendations.some((page) => pageModes[page.pageId] === "EXACT_REPLICA" && !page.referenceAvailable);
    if (exactUnavailable) {
      setError("Exact Replica is unavailable for one or more selected pages. Provide a matching reference visual or choose Editable.");
      return;
    }
    const warning = mode === "REPLACE" && existingV2
      ? "This will replace the current V2 pages after a fresh safety check. Continue?"
      : "Apply the analyzed Editable/Exact Replica pages to this Content Studio item?";
    if (!globalThis.confirm(warning)) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("action", "confirm");
      form.set("bookId", bookId);
      form.set("nodeId", nodeId);
      form.set("nodeType", nodeType);
      form.set("package", file);
      form.set("mode", mode);
      form.set("pageModes", JSON.stringify(pageModes));
      form.set("currentContentHash", analysis.currentContentHash);
      const response = await fetch("/api/admin/content/import/idml", { method: "POST", body: form });
      const body = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) throw new Error(body.message || "Unable to apply the imported document.");
      setMessage("Import confirmed. Reloading the saved V2 document…");
      globalThis.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to apply the imported document.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4 pt-[8vh]" role="dialog" aria-modal="true" aria-label="Import InDesign package" data-v2-import-overlay>
    <section className="w-full max-w-6xl rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-2xl" data-testid="idml-import-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Import</p>
          <p className="text-sm font-semibold text-slate-900">InDesign Package (.zip or .idml)</p>
        </div>
        <label className="cursor-pointer rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-800">
          {file ? file.name : "Choose package"}
          <input type="file" accept=".zip,.idml,application/zip" className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setAnalysis(null); setPageModes({}); setError(""); setXmlFailure(null); setSizeFailure(null); setMessage(""); }} />
        </label>
        <button type="button" disabled={!file || busy} onClick={() => void analyze()} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy && !analysis ? "Analyzing…" : "Analyze"}</button>
        {onClose ? <button type="button" onClick={onClose} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">Close</button> : null}
      </div>
      <p className="mt-2 text-xs text-slate-600">Upload → analyze → review fidelity → preview → explicit confirmation. Existing content is unchanged until confirmation.</p>
      {sizeFailure ? <IdmlSizeFailureNotice failure={sizeFailure} /> : xmlFailure ? <IdmlXmlFailureNotice failure={xmlFailure} /> : error ? <p role="alert" className="mt-2 rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-800">{error}</p> : null}
      {message ? <p className="mt-2 text-xs font-semibold text-emerald-700">{message}</p> : null}
      {analysis ? <AnalysisView analysis={analysis.analysis} pageIndex={pageIndex} pageCount={pageCount} pageModes={pageModes} previewDocument={previewDocument} existingV2={existingV2} mode={mode} semanticOverlay={semanticOverlay} busy={busy} onPageChange={setPageIndex} onPageModeChange={(pageId, value) => setPageModes((current) => ({ ...current, [pageId]: value }))} onModeChange={setMode} onSemanticOverlayChange={setSemanticOverlay} onConfirm={() => void confirmImport()} /> : null}
    </section>
    </div>
  );
}

function AnalysisView({ analysis, pageIndex, pageCount, pageModes, previewDocument, existingV2, mode, semanticOverlay, busy, onPageChange, onPageModeChange, onModeChange, onSemanticOverlayChange, onConfirm }: { analysis: Omit<IdmlAnalysis, "intermediate">; pageIndex: number; pageCount: number; pageModes: PageModes; previewDocument: ContentDocument | null; existingV2: boolean; mode: "REPLACE" | "APPEND"; semanticOverlay: boolean; busy: boolean; onPageChange: (value: number) => void; onPageModeChange: (pageId: string, value: LayoutV2VisualMode) => void; onModeChange: (value: "REPLACE" | "APPEND") => void; onSemanticOverlayChange: (value: boolean) => void; onConfirm: () => void }) {
  const summary = analysis.summary;
  const currentPage = analysis.pageRecommendations[pageIndex];
  const exactUnavailable = analysis.pageRecommendations.some((page) => pageModes[page.pageId] === "EXACT_REPLICA" && !page.referenceAvailable);
  return (
    <div className="mt-3 space-y-3 border-t border-indigo-200 pt-3">
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-8">
        {[ ["Pages", summary.pagesDetected], ["Editable", summary.editableRecommended], ["Review", summary.reviewRecommended], ["Replica", summary.exactRecommended], ["Missing links", summary.missingLinks], ["Fonts", summary.fontSubstitutions], ["Effects", summary.advancedEffects], ["Errors", summary.errors] ].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-white px-2 py-2"><span className="block text-slate-500">{label}</span><strong>{value}</strong></div>)}
      </div>
      {existingV2 ? <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900"><span>Current V2 pages exist.</span><label><select value={mode} onChange={(event) => onModeChange(event.target.value as "REPLACE" | "APPEND")} className="ml-2 rounded border border-amber-300 bg-white px-2 py-1"><option value="REPLACE">Replace current pages</option><option value="APPEND">Append imported pages</option></select></label></div> : null}
      <div className="grid gap-3 lg:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)]">
        <div className="max-h-[22rem] overflow-auto rounded-xl bg-white p-2 text-xs">
          <p className="px-2 pb-2 font-bold text-slate-700">Page recommendations</p>
          <div className="space-y-1">{analysis.pageRecommendations.map((page) => <div key={page.pageId} className={`rounded-lg border px-2 py-2 ${page.pageId === currentPage?.pageId ? "border-indigo-400 bg-indigo-50" : "border-slate-100"}`}><button type="button" onClick={() => onPageChange(page.pageNumber - 1)} className="font-bold text-slate-800">Page {page.pageNumber}</button><div className="mt-1 flex items-center gap-2"><select aria-label={`Page ${page.pageNumber} visual mode`} value={pageModes[page.pageId] ?? "EDITABLE"} onChange={(event) => onPageModeChange(page.pageId, event.target.value as LayoutV2VisualMode)} className="rounded border border-slate-200 bg-white px-1 py-1 text-[11px] font-semibold" disabled={!page.referenceAvailable && page.recommendation === "EXACT_REPLICA"}><option value="EDITABLE">Editable</option><option value="EXACT_REPLICA" disabled={!page.referenceAvailable}>Exact Replica</option></select><span className={page.level === "HIGH" ? "font-bold text-fuchsia-700" : page.level === "MEDIUM" ? "font-semibold text-amber-700" : "text-emerald-700"}>{page.level} risk</span></div><p className="mt-1 text-slate-500">{page.reasons.length ? page.reasons.join(" · ") : "Text, images, shapes"}{!page.referenceAvailable && page.recommendation === "EXACT_REPLICA" ? " · Reference visual required" : ""}</p></div>)}</div>
        </div>
        <div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-slate-700">Preview page {Math.min(pageIndex + 1, Math.max(1, pageCount))} of {pageCount}</span><div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs font-semibold text-fuchsia-700"><input type="checkbox" checked={semanticOverlay} onChange={(event) => onSemanticOverlayChange(event.target.checked)} /> Semantic Overlay</label><button type="button" disabled={pageIndex <= 0} onClick={() => onPageChange(pageIndex - 1)} className="rounded border bg-white px-2 py-1 text-xs font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={pageIndex >= pageCount - 1} onClick={() => onPageChange(pageIndex + 1)} className="rounded border bg-white px-2 py-1 text-xs font-semibold disabled:opacity-40">Next</button></div></div>{previewDocument ? <div className="max-h-[34rem] overflow-auto rounded-xl bg-slate-100 p-2"><V2ContentDocumentRenderer document={previewDocument} mode="ADMIN_PREVIEW" resourceUrls={analysis.previewResourceUrls} semanticOverlay={semanticOverlay} /></div> : null}</div>
      </div>
      {analysis.diagnostics.length ? <DiagnosticList diagnostics={analysis.diagnostics} /> : null}
      {exactUnavailable ? <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">Exact Replica is unavailable for a selected page until a matching reference visual is provided.</p> : null}
      <button type="button" disabled={busy || summary.errors > 0 || exactUnavailable} onClick={onConfirm} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "Applying…" : "Confirm and import V2 — Editable / Hybrid"}</button>
    </div>
  );
}

function IdmlXmlFailureNotice({ failure }: { failure: IdmlXmlFailure }) {
  return <section role="alert" className="mt-2 rounded-lg bg-rose-100 px-3 py-2 text-xs text-rose-900">
    <p className="font-bold">Import analysis failed</p>
    <p className="mt-1"><strong>File:</strong> {failure.entryPath}</p>
    <p className="mt-1"><strong>Problem:</strong> {failure.problem}</p>
    {failure.line && failure.column ? <p className="mt-1"><strong>Location:</strong> line {failure.line}, column {failure.column}</p> : null}
    <p className="mt-1 text-rose-800">The IDML package contains invalid XML. Re-export it from InDesign or repair this file.</p>
  </section>;
}

function IdmlSizeFailureNotice({ failure }: { failure: IdmlSizeFailure }) {
  return <section role="alert" className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-950">
    <p className="font-bold">Import analysis stopped</p>
    <p className="mt-1"><strong>File:</strong> {failure.entryPath}</p>
    <p className="mt-1"><strong>Problem:</strong> {failure.problem}</p>
    <p className="mt-1"><strong>Allowed size:</strong> {formatBytes(failure.allowedBytes)}</p>
    {failure.detectedBytes === undefined ? null : <p className="mt-1"><strong>Detected size:</strong> {formatBytes(failure.detectedBytes)}</p>}
    <p className="mt-1 text-amber-900">This is a safety limit, not an invalid-XML error. {failure.category === "NESTED_IDML" ? "This IDML document is larger than the current safe import limit." : failure.category === "STORY_TEXT" ? "This story contains more extracted text than the current safe import limit." : "Reduce the package or file size and analyze it again."}</p>
  </section>;
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(value % (1024 * 1024) === 0 ? 0 : 1)} MB`;
  if (value >= 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${value} bytes`;
}

function DiagnosticList({ diagnostics }: { diagnostics: IdmlDiagnostic[] }) {
  return <details className="rounded-lg bg-white px-3 py-2 text-xs"><summary className="cursor-pointer font-bold text-slate-700">Review diagnostics ({diagnostics.length})</summary><ul className="mt-2 max-h-48 space-y-1 overflow-auto">{diagnostics.map((item, index) => <li key={`${item.pageId ?? "document"}-${index}`} className={item.severity === "ERROR" ? "text-rose-700" : item.severity === "WARNING" ? "text-amber-700" : "text-slate-600"}><strong>{item.severity}</strong>{item.pageNumber ? ` · Page ${item.pageNumber}` : ""}{item.objectType ? ` · ${item.objectType}` : ""}: {item.message}{item.suggestedAction ? <span className="block pl-2 text-slate-500">Action: {item.suggestedAction}</span> : null}</li>)}</ul></details>;
}
