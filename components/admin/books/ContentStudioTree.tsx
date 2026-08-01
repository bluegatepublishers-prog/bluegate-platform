"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronRight, FileText, Folder, Search } from "lucide-react";

import { flattenContentTree, type ContentTreeNode } from "@/lib/content-studio-tree";

function realChildren(node: ContentTreeNode) {
  return node.children.filter((child) => child.type !== "FOLDER");
}

export default function ContentStudioTree({ bookId, root, selectedKey }: { bookId: string; root: ContentTreeNode; selectedKey: string }) {
  const storageKey = `bluegate:content-tree:${bookId}`;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([root.key]));
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const value = sessionStorage.getItem(storageKey);
        if (value) setExpanded(new Set(JSON.parse(value) as string[]));
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  function commit(next: Set<string>) {
    setExpanded(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {}
  }

  const all = useMemo(() => flattenContentTree(root).filter((node) => node.type !== "FOLDER"), [root]);
  const visible = useMemo(() => query.trim() ? filterTree(root, query.toLowerCase()) : root, [query, root]);

  function navigate(event: React.MouseEvent) {
    if (document.querySelector("[data-content-editor-dirty='true']") && !confirm("Discard unsaved changes and select another item?")) event.preventDefault();
  }

  function keyboard(event: React.KeyboardEvent<HTMLElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>("a[data-tree-link]")];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (!links.length) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : event.key === "ArrowDown" ? Math.min(links.length - 1, index + 1) : Math.max(0, index - 1);
    links[next]?.focus();
  }

  return <div className="flex h-full min-h-0 flex-col">
    <div className="border-b p-4">
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this Book" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm"/></div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => commit(new Set(all.map((node) => node.key)))} className="rounded-lg border px-3 py-2 text-xs font-semibold">Expand all</button>
        <button type="button" onClick={() => commit(new Set([root.key]))} className="rounded-lg border px-3 py-2 text-xs font-semibold">Collapse all</button>
        {selectedKey !== root.key ? <Link href={`/admin/books/${bookId}/content`} onClick={navigate} className="ml-auto rounded-lg px-2 py-2 text-xs font-semibold text-blue-700">Clear</Link> : null}
      </div>
    </div>
    <nav aria-label="Content tree" role="tree" onKeyDown={keyboard} className="min-h-0 flex-1 overflow-y-auto p-2">
      <TreeRow node={visible} level={1} selectedKey={selectedKey} expanded={expanded} toggle={(key) => { const next = new Set(expanded); if (next.has(key)) next.delete(key); else next.add(key); commit(next); }} navigate={navigate} bookId={bookId}/>
      {query && !realChildren(visible).length && !visible.title.toLowerCase().includes(query.toLowerCase()) ? <p className="p-6 text-center text-sm text-slate-500">No matching content.</p> : null}
    </nav>
  </div>;
}

function TreeRow({ node, level, selectedKey, expanded, toggle, navigate, bookId }: { node: ContentTreeNode; level: number; selectedKey: string; expanded: Set<string>; toggle: (key: string) => void; navigate: (event: React.MouseEvent) => void; bookId: string }) {
  const children = realChildren(node);
  const open = expanded.has(node.key);
  const hasChildren = children.length > 0;
  const Icon = node.type === "BOOK" ? BookOpen : node.type === "TOPIC" || node.type === "MODULE" ? FileText : Folder;
  const selected = selectedKey === node.key || (node.type === "CHAPTER" && selectedKey.startsWith(`FOLDER:${node.id}:`));

  return <div role="treeitem" aria-level={level} aria-expanded={hasChildren ? open : undefined} aria-selected={selected}>
    <div className={`flex items-center rounded-lg ${selected ? "bg-blue-100 text-blue-900" : "hover:bg-slate-50"}`} style={{ paddingLeft: `${(level - 1) * 14}px` }}>
      {hasChildren ? <button type="button" onClick={() => toggle(node.key)} aria-label={`${open ? "Collapse" : "Expand"} ${node.title}`} className="rounded p-2"><ChevronRight className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`}/></button> : <span className="w-8"/>}
      <Link data-tree-link href={`/admin/books/${bookId}/content?selected=${encodeURIComponent(node.key)}`} onClick={navigate} className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Icon className="h-4 w-4 shrink-0"/><span className={`truncate ${node.archived ? "text-slate-400 line-through" : ""}`}>{node.title}</span></Link>
    </div>
    {hasChildren && open ? <div role="group">{children.map((child) => <TreeRow key={child.key} node={child} level={level + 1} selectedKey={selectedKey} expanded={expanded} toggle={toggle} navigate={navigate} bookId={bookId}/>)}</div> : null}
  </div>;
}

function filterTree(node: ContentTreeNode, query: string): ContentTreeNode {
  const children = realChildren(node).map((child) => filterTree(child, query)).filter((child) => child.title.toLowerCase().includes(query) || child.children.length);
  return { ...node, children };
}
