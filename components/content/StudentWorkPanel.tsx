"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Bookmark, Highlighter, StickyNote, X } from "lucide-react";
import type { ContentDocument } from "@/lib/content-document";
import { payloadHighlightText, payloadText } from "@/lib/student-work-client";
import { useStudentWork } from "@/components/content/StudentWorkProvider";
import { getBookProgress } from "@/lib/student-work-progress";

type ProgressModule = { moduleId: string; document: ContentDocument };

export default function StudentWorkPanel({ moduleIds = [], progressModules = [] }: { moduleIds?: string[]; progressModules?: ProgressModule[] }) {
  const { items, loading, getState, remove } = useStudentWork();
  const [open, setOpen] = useState(false);
  const progress = useMemo(() => getBookProgress(progressModules, items), [items, progressModules]);
  const visible = useMemo(() => items.filter((item) => ["NOTE", "HIGHLIGHT", "BOOKMARK"].includes(item.type) && (!moduleIds.length || !item.target.moduleId || moduleIds.includes(item.target.moduleId))), [items, moduleIds]);
  const notes = visible.filter((item) => item.type === "NOTE");
  const highlights = visible.filter((item) => item.type === "HIGHLIGHT");
  const bookmarks = visible.filter((item) => item.type === "BOOKMARK");
  const jump = (item: (typeof visible)[number]) => {
    const scope = item.target.moduleId ? document.querySelector(`[data-student-work-module-id="${CSS.escape(item.target.moduleId)}"]`) : document;
    const page = item.target.pageId ? scope?.querySelector(`[data-v2-delivery-page-id="${CSS.escape(item.target.pageId)}"]`) : null;
    const frame = item.target.frameId ? scope?.querySelector(`[data-v2-delivery-frame-id="${CSS.escape(item.target.frameId)}"]`) : null;
    (frame ?? page)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setOpen(false);
  };
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-xl hover:bg-slate-700">
        <StickyNote className="h-4 w-4" /> My Work {visible.length ? `(${visible.length})` : ""}
      </button>
      {open ? <aside aria-label="My Work" className="fixed inset-x-3 bottom-16 z-50 max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:left-auto sm:w-96">
        <div className="flex items-center justify-between"><div><p className="text-lg font-bold text-slate-950">My Work</p><p className="text-xs text-slate-500">Private to you</p></div><button type="button" aria-label="Close My Work" onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
        {loading ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Loading your work...</p> : null}
        {progressModules.length ? <section className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3" aria-label={`${progress.percentage}% progress`}><p className="text-sm font-bold text-blue-900">Progress {progress.percentage}%</p><p className="mt-1 text-xs text-slate-700">{progress.completedPages}/{progress.totalPages} pages done</p>{progress.answerableQuestions ? <p className="text-xs text-slate-700">{progress.answeredQuestions}/{progress.answerableQuestions} questions answered</p> : null}</section> : null}
        <WorkGroup icon={<StickyNote className="h-4 w-4" />} title="Notes" empty={notes.length === 0}>{notes.map((item) => <WorkRow key={item.id} label={pageLabel(item.target.pageId)} text={payloadText(item.payload)} status={item.status} state={getState(item.type, item.target)} onClick={() => jump(item)} onDelete={() => void remove(item)} />)}</WorkGroup>
        <WorkGroup icon={<Highlighter className="h-4 w-4" />} title="Highlights" empty={highlights.length === 0}>{highlights.map((item) => <WorkRow key={item.id} label={pageLabel(item.target.pageId)} text={payloadHighlightText(item.payload) || "Semantic region"} status={item.status} state={getState(item.type, item.target)} onClick={() => jump(item)} onDelete={() => void remove(item)} />)}</WorkGroup>
        <WorkGroup icon={<Bookmark className="h-4 w-4" />} title="Bookmarks" empty={bookmarks.length === 0}>{bookmarks.map((item) => <WorkRow key={item.id} label={pageLabel(item.target.pageId)} text="Bookmarked page" status={item.status} state={getState(item.type, item.target)} onClick={() => jump(item)} onDelete={() => void remove(item)} />)}</WorkGroup>
      </aside> : null}
    </>
  );
}

function WorkGroup({ icon, title, empty, children }: { icon: ReactNode; title: string; empty: boolean; children: ReactNode }) {
  return <section className="mt-4 border-t border-slate-100 pt-3"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">{icon}{title}</h2>{empty ? <p className="mt-2 text-xs text-slate-400">Nothing here yet.</p> : <div className="mt-2 space-y-2">{children}</div>}</section>;
}

function WorkRow({ label, text, status, state, onClick, onDelete }: { label: string; text: string; status: string; state: string; onClick: () => void; onDelete: () => void }) {
  return <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2"><button type="button" onClick={onClick} className="min-w-0 flex-1 text-left"><span className="block text-[11px] font-bold text-blue-700">{label}</span><span className="block truncate text-xs text-slate-700">{text}</span>{status !== "CURRENT" ? <span className="block text-[10px] font-semibold text-amber-700">{status === "STALE" ? "Source changed" : "Content no longer available"}</span> : null}{state === "CONFLICT" ? <span className="block text-[10px] font-semibold text-rose-700">Changed elsewhere</span> : null}</button><button type="button" onClick={onDelete} aria-label={`Delete ${label} work`} className="text-[11px] font-semibold text-slate-400 hover:text-rose-600">Delete</button></div>;
}

function pageLabel(pageId?: string) {
  if (!pageId) return "Book";
  if (typeof document === "undefined") return "Page";
  const page = document.querySelector(`[data-v2-delivery-page-id="${CSS.escape(pageId)}"]`);
  return page?.getAttribute("aria-label") ?? "Page";
}