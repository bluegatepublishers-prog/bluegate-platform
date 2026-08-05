"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, Layout, PanelLeft, X } from "lucide-react";

import ContentStudioTree from "@/components/admin/books/ContentStudioTree";
import type { ContentTreeNode } from "@/lib/content-studio-tree";

type StudioView = "hierarchy" | "canvas";

export default function ContentStudioShell({
  bookId,
  bookTitle,
  root,
  selectedKey,
  selectedTitle,
  children,
}: {
  bookId: string;
  bookTitle: string;
  root: ContentTreeNode;
  selectedKey: string;
  selectedTitle: string;
  children: ReactNode;
}) {
  const [view, setView] = useState<StudioView>(() => readView(bookId));
  const [mobileHierarchyOpen, setMobileHierarchyOpen] = useState(false);
  const canvasButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(`bluegate:studio:${bookId}:view`, view);
    } catch {}
  }, [bookId, view]);

  function switchView(next: StudioView) {
    setMobileHierarchyOpen(false);
    setView(next);
    if (next === "canvas") window.setTimeout(() => canvasButtonRef.current?.focus(), 0);
  }

  const breadcrumb = findPath(root, selectedKey).map((node) => node.title);

  return (
    <section className="flex min-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#f7f4ed] shadow-sm">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/books/${bookId}/content`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-950">
            <BookOpen className="h-5 w-5 text-blue-700" />
            <span className="max-w-[14rem] truncate">{bookTitle}</span>
          </Link>
          <span className="text-slate-300">/</span>
          <div className="min-w-0 flex-1 truncate text-sm text-slate-500">
            {breadcrumb.length ? breadcrumb.join(" / ") : selectedTitle}
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1" aria-label="Studio view">
            <button
              type="button"
              aria-pressed={view === "hierarchy"}
              onClick={() => switchView("hierarchy")}
              className={viewButton(view === "hierarchy")}
            >
              <PanelLeft className="h-4 w-4" />
              Hierarchy
            </button>
            <button
              ref={canvasButtonRef}
              type="button"
              aria-pressed={view === "canvas"}
              onClick={() => switchView("canvas")}
              className={viewButton(view === "canvas")}
            >
              <Layout className="h-4 w-4" />
              Canvas
            </button>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 lg:hidden"
            onClick={() => setMobileHierarchyOpen(true)}
            aria-label="Open hierarchy"
          >
            <PanelLeft className="h-4 w-4" />
            Tree
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {view === "hierarchy" ? (
          <div className="min-h-[calc(100dvh-14rem)] bg-white px-4 py-5 sm:px-8 lg:px-16">
            <div className="mx-auto max-w-6xl">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Hierarchy</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{bookTitle}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage the book structure, then open any node in the manuscript canvas.</p>
                </div>
                <button type="button" onClick={() => switchView("canvas")} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">
                  Open selected canvas
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-[#fcfaf5] p-3 sm:p-5">
                <ContentStudioTree bookId={bookId} root={root} selectedKey={selectedKey} />
              </div>
            </div>
          </div>
        ) : (
          <main className="min-h-[calc(100dvh-14rem)] min-w-0 p-3 sm:p-5 lg:p-8">{children}</main>
        )}
      </div>

      {mobileHierarchyOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/30 p-3 lg:hidden">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="font-bold text-slate-950">Hierarchy</span>
              <button type="button" onClick={() => setMobileHierarchyOpen(false)} aria-label="Close hierarchy" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 p-3"><ContentStudioTree bookId={bookId} root={root} selectedKey={selectedKey} /></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function viewButton(active: boolean) {
  return `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`;
}

function readView(bookId: string): StudioView {
  if (typeof window === "undefined") return "canvas";
  try {
    const value = localStorage.getItem(`bluegate:studio:${bookId}:view`);
    return value === "hierarchy" || value === "canvas" ? value : "canvas";
  } catch {
    return "canvas";
  }
}

function findPath(root: ContentTreeNode, key: string): ContentTreeNode[] {
  if (root.key === key) return [root];
  for (const child of root.children) {
    const path = findPath(child, key);
    if (path.length) return [root, ...path];
  }
  return [];
}
