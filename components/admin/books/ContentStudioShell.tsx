"use client";

import Link from "next/link";

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

export default function ContentStudioShell({ bookId, root, selectedKey, children }: { bookId: string; root: ContentTreeNode; selectedKey: string; children: React.ReactNode }) {
  const rootSelected = selectedKey === root.key;
  const parts = selectedKey.split(":");
  const chapterId = parts[0] === "CHAPTER" ? parts[1] : parts[0] === "FOLDER" ? parts[1] : null;
  const activeTab = parts[0] === "FOLDER" ? parts[2] : "overview";

  return <div className="grid min-h-[calc(100dvh-14rem)] overflow-hidden rounded-2xl border bg-white shadow-sm lg:grid-cols-[360px_minmax(0,1fr)]">
    <aside className={`${rootSelected ? "block" : "hidden"} min-h-[32rem] border-r lg:block`}>
      <ContentStudioTree bookId={bookId} root={root} selectedKey={selectedKey}/>
    </aside>
    <section className={`${rootSelected ? "hidden" : "block"} min-w-0 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:block`}>
      <Link href={`/admin/books/${bookId}/content`} className="mb-4 inline-flex rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-blue-700 lg:hidden">← Back to Structure</Link>
      {chapterId ? <nav aria-label="Chapter editor" className="mb-6 flex gap-2 overflow-x-auto rounded-xl border bg-white p-2">
        {chapterTabs.map((tab) => {
          const selected = activeTab === tab.key;
          const target = tab.key === "overview" ? `CHAPTER:${chapterId}` : `FOLDER:${chapterId}:${tab.key}`;
          return <Link key={tab.key} href={`/admin/books/${bookId}/content?selected=${encodeURIComponent(target)}`} aria-current={selected ? "page" : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${selected ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{tab.label}</Link>;
        })}
      </nav> : null}
      {children}
    </section>
  </div>;
}
