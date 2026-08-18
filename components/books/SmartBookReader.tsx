"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, BookOpen, Library } from "lucide-react";
import SmartBookContentsPanel from "@/components/books/SmartBookContentsPanel";
import SmartBookViewer from "@/components/books/SmartBookViewer";
import V2ContentDocumentRenderer from "@/components/content/V2ContentDocumentRenderer";
import type { ContentDocument } from "@/lib/content-document";
import { getContentLayoutVersion } from "@/lib/content-layout-v2";
import type { ResolvedLinkedAsset, ContentSectionDefinitionSummary } from "@/lib/content-linked-asset-types";
import type { ResolvedMediaBlock } from "@/lib/content-media-types";
import type { ResolvedActivityBlock } from "@/lib/activity-studio-types";
import type { ResolvedWorksheetBlock } from "@/lib/worksheet-studio-types";
import type { KnowledgeDefinitionSummary } from "@/lib/content-knowledge-types";
import type { SmartBookContentsNode } from "@/lib/smart-book-contents";

type TeacherResource = { id: string; title: string; fileName: string; category: string; openPath: string };

type Props = {
  role: "TEACHER" | "STUDENT";
  bookId: string;
  title: string;
  subjectPath?: string;
  initialPage?: number;
  initialTotalPages?: number | null;
  initialBookmarks?: number[];
  contents: SmartBookContentsNode[];
  document?: ContentDocument | null;
  linkedAssets?: Record<string, ResolvedLinkedAsset | null>;
  activities?: Record<string, ResolvedActivityBlock>;
  worksheets?: Record<string, ResolvedWorksheetBlock>;
  media?: Record<string, ResolvedMediaBlock | null>;
  sections?: ContentSectionDefinitionSummary[];
  knowledgeDefinitions?: Record<string, KnowledgeDefinitionSummary | null>;
  resourceUrls?: Record<string, string>;
  teacherResources?: TeacherResource[];
};

export default function SmartBookReader({
  role,
  bookId,
  title,
  subjectPath,
  initialPage = 1,
  initialTotalPages = null,
  initialBookmarks = [],
  contents,
  document,
  linkedAssets = {},
  activities = {},
  worksheets = {},
  media = {},
  sections = [],
  knowledgeDefinitions = {},
  resourceUrls = {},
  teacherResources = [],
}: Props) {
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [bookmarks, setBookmarks] = useState(() => new Set(initialBookmarks));
  const [contentsOpen, setContentsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [message, setMessage] = useState("");
  const hasV2 = Boolean(document && getContentLayoutVersion(document) === 2);

  useEffect(() => {
    if (role !== "STUDENT" || !totalPages) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/student/books/${encodeURIComponent(bookId)}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPage: page, totalPages }),
        });
        if (!response.ok) throw new Error();
        setMessage("Reading position saved");
      } catch {
        setMessage("We could not save your reading position.");
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [bookId, page, role, totalPages]);

  async function toggleBookmark() {
    if (role !== "STUDENT") return;
    try {
      const response = await fetch(`/api/student/books/${encodeURIComponent(bookId)}/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageNumber: page, totalPages }),
      });
      const data = await response.json() as { ok?: boolean; bookmarked?: boolean };
      if (!response.ok || !data.ok) throw new Error();
      setBookmarks((current) => {
        const next = new Set(current);
        if (data.bookmarked) next.add(page);
        else next.delete(page);
        return next;
      });
    } catch {
      setMessage("We could not save this page bookmark.");
    }
  }

  const overlay = useMemo(() => {
    if (!hasV2 || !document) return null;
    return <V2ContentDocumentRenderer document={document} mode={role} linkedAssets={linkedAssets} activities={activities} worksheets={worksheets} media={media} sectionDefinitions={sections} knowledgeDefinitions={knowledgeDefinitions} resourceUrls={resourceUrls} pageNumber={page} overlayOnly />;
  }, [activities, document, hasV2, knowledgeDefinitions, linkedAssets, media, page, resourceUrls, role, sections, worksheets]);

  return (
    <div className="space-y-4">
      <header className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={role === "TEACHER" ? "/teacher-dashboard/books" : "/student-dashboard/books"} className="mr-auto inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><BookOpen className="h-4 w-4" />My Books</Link>
          <button type="button" onClick={() => setContentsOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"><Library className="h-4 w-4" />Contents</button>
          {role === "TEACHER" ? <button type="button" onClick={() => setResourcesOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-100">Teacher Resources</button> : null}
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500" aria-live="polite">Page {page} of {totalPages ?? ""}{message ? ` � ${message}` : ""}</p>
      </header>
      <SmartBookViewer pdfUrl={`/api/books/${encodeURIComponent(bookId)}/full-pdf`} initialPage={initialPage} currentPage={page} onPageChange={setPage} onDocumentLoad={({ totalPages: count }) => { setTotalPages(count); setPage((current) => Math.min(Math.max(1, current), count)); }} minimalControls showFullscreen={false} pageOverlay={overlay} />
      <div className="flex flex-wrap items-center justify-center gap-3">
        {role === "STUDENT" ? <button type="button" onClick={() => void toggleBookmark()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">{bookmarks.has(page) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}Bookmark</button> : null}
        {subjectPath ? <Link href={subjectPath} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Back to Subject</Link> : null}
      </div>
      {contentsOpen ? <SmartBookContentsPanel nodes={contents} onClose={() => setContentsOpen(false)} onNavigate={setPage} /> : null}
      {resourcesOpen && role === "TEACHER" ? <ResourcePanel resources={teacherResources} onClose={() => setResourcesOpen(false)} /> : null}
    </div>
  );
}

function ResourcePanel({ resources, onClose }: { resources: TeacherResource[]; onClose: () => void }) {
  const groups = new Map<string, TeacherResource[]>();
  resources.forEach((resource) => groups.set(resource.category, [...(groups.get(resource.category) ?? []), resource]));
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Teacher Resources"><button type="button" aria-label="Close Teacher Resources" onClick={onClose} className="absolute inset-0 bg-slate-950/40" /><aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"><header className="flex items-center justify-between border-b px-5 py-4"><h2 className="text-lg font-bold">Teacher Resources</h2><button type="button" onClick={onClose} aria-label="Close Teacher Resources" className="rounded-xl border px-3 py-2 text-sm font-semibold">Close</button></header><div className="min-h-0 flex-1 overflow-y-auto p-5">{groups.size ? [...groups.entries()].map(([category, items]) => <section key={category} className="mb-6"><h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-teal-700">{category}</h3><div className="space-y-2">{items.map((item) => <a key={item.id} href={item.openPath} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:border-teal-300"><span className="min-w-0 truncate">{item.title}</span><span className="ml-3 shrink-0 text-teal-700">Open</span></a>)}</div></section>) : <p className="text-sm text-slate-500">No Teacher Resources are available for this book.</p>}</div></aside></div>;
}
