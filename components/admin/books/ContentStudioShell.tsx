"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  X,
} from "lucide-react";

import ContentStudioTree from "@/components/admin/books/ContentStudioTree";
import type { ContentTreeNode } from "@/lib/content-studio-tree";

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
  const [mobileHierarchyOpen, setMobileHierarchyOpen] =
    useState(false);

  const [hierarchyCollapsed, setHierarchyCollapsed] =
    useState(false);

  const path = findPath(root, selectedKey);
  const storageKey = `bluegate:studio:${bookId}:hierarchy-collapsed`;

  useEffect(() => {
    try {
      setHierarchyCollapsed(
        localStorage.getItem(storageKey) === "1",
      );
    } catch {}
  }, [storageKey]);

  function toggleHierarchy() {
    setHierarchyCollapsed((current) => {
      const next = !current;

      try {
        localStorage.setItem(
          storageKey,
          next ? "1" : "0",
        );
      } catch {}

      return next;
    });
  }

  return (
    <section className="relative flex h-[calc(100dvh-7.5rem)] min-h-[640px] min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Desktop hierarchy */}
      <aside
        className={`relative hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 lg:flex lg:min-h-0 lg:flex-col ${
          hierarchyCollapsed
            ? "w-10"
            : "w-[320px]"
        }`}
      >
        {hierarchyCollapsed ? (
          <div className="flex h-full flex-col items-center">
            <button
              type="button"
              onClick={toggleHierarchy}
              className="mt-2 flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-700"
              aria-label="Open hierarchy"
              title="Open hierarchy"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <div className="mt-3 flex flex-1 items-start">
              <span className="[writing-mode:vertical-rl] rotate-180 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Hierarchy
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 px-3">
              <div className="flex min-w-0 items-center gap-2">
                <PanelLeft className="h-3.5 w-3.5 shrink-0 text-blue-700" />

                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                  Hierarchy
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                  Structure
                </span>

                <button
                  type="button"
                  onClick={toggleHierarchy}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-blue-700"
                  aria-label="Collapse hierarchy"
                  title="Collapse hierarchy"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <ContentStudioTree
                bookId={bookId}
                root={root}
                selectedKey={selectedKey}
              />
            </div>
          </>
        )}
      </aside>

      {/* Main workspace */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#f7f8fa]">
        <header className="flex min-h-11 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3">
          <button
            type="button"
            onClick={() =>
              setMobileHierarchyOpen(true)
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
            aria-label="Open hierarchy"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>

          <BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-700" />

          <nav
            aria-label="Content path"
            className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-[10px]"
          >
            {path.length ? (
              path.map((node, index) => {
                const isLast =
                  index === path.length - 1;

                return (
                  <span
                    key={node.key}
                    className="flex min-w-0 items-center gap-1"
                  >
                    {index > 0 ? (
                      <span className="shrink-0 text-slate-300">
                        /
                      </span>
                    ) : null}

                    <Link
                      href={
                        node.key === root.key
                          ? `/admin/books/${bookId}/content`
                          : `/admin/books/${bookId}/content?selected=${encodeURIComponent(
                              node.key,
                            )}`
                      }
                      title={node.title}
                      className={
                        isLast
                          ? "max-w-[16rem] truncate font-bold text-slate-900"
                          : "max-w-[12rem] truncate font-medium text-slate-500 hover:text-blue-700"
                      }
                    >
                      {node.title}
                    </Link>
                  </span>
                );
              })
            ) : (
              <span className="truncate font-bold text-slate-900">
                {selectedTitle ||
                  bookTitle}
              </span>
            )}
          </nav>

          {/* Desktop quick-open button when hierarchy is collapsed */}
          {hierarchyCollapsed ? (
            <button
              type="button"
              onClick={toggleHierarchy}
              className="hidden h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[9px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-blue-700 lg:inline-flex"
              title="Open hierarchy"
            >
              <PanelLeft className="h-3 w-3" />
              Hierarchy
            </button>
          ) : null}
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile hierarchy drawer */}
      {mobileHierarchyOpen ? (
        <div className="fixed inset-0 z-[100] bg-slate-950/35 lg:hidden">
          <div className="flex h-full w-[min(88vw,340px)] flex-col bg-white shadow-2xl">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-3">
              <div className="flex items-center gap-2">
                <PanelLeft className="h-4 w-4 text-blue-700" />
                <span className="text-xs font-bold text-slate-900">
                  Hierarchy
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileHierarchyOpen(false)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close hierarchy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <ContentStudioTree
                bookId={bookId}
                root={root}
                selectedKey={selectedKey}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function findPath(
  root: ContentTreeNode,
  key: string,
): ContentTreeNode[] {
  if (root.key === key) {
    return [root];
  }

  for (const child of root.children) {
    const path = findPath(
      child,
      key,
    );

    if (path.length) {
      return [
        root,
        ...path,
      ];
    }
  }

  return [];
}