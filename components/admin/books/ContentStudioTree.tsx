"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { KeyboardEvent, MouseEvent, TransitionStartFunction } from "react";
import { BookOpen, ChevronRight, Copy, FileText, Folder, GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";

import {
  createContentChildAction,
  deleteContentNodeAction,
  duplicateContentNodeAction,
  renameContentNodeAction,
  reorderContentBranchAction,
} from "@/app/admin/books/[id]/content/actions";
import { flattenContentTree, type ContentNodeType, type ContentTreeNode } from "@/lib/content-studio-tree";
import type { BookStructureNodeType } from "@/lib/book-structure-management";

function realChildren(node: ContentTreeNode) {
  return node.children.filter((child) => child.type !== "FOLDER");
}

type TreeActionsState = {
  key: string | null;
  type: ContentNodeType | null;
};

export default function ContentStudioTree({
  bookId,
  root,
  selectedKey,
}: {
  bookId: string;
  root: ContentTreeNode;
  selectedKey: string;
}) {
  const storageKey = `bluegate:content-tree:${bookId}`;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([root.key]));
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [activeAdd, setActiveAdd] = useState<TreeActionsState>({ key: null, type: null });
  const [addTitle, setAddTitle] = useState("");
  const [addType, setAddType] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

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

  const all = useMemo(
    () => flattenContentTree(root).filter((node) => node.type !== "FOLDER"),
    [root],
  );
  const visible = useMemo(
    () => (query.trim() ? filterTree(root, query.toLowerCase()) : root),
    [query, root],
  );

  function navigate(event: MouseEvent) {
    if (
      document.querySelector("[data-content-editor-dirty='true']") &&
      !confirm("Discard unsaved changes and select another item?")
    ) {
      event.preventDefault();
    }
  }

  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>("a[data-tree-link]")];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (!links.length) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? links.length - 1
          : event.key === "ArrowDown"
            ? Math.min(links.length - 1, index + 1)
            : Math.max(0, index - 1);
    links[nextIndex]?.focus();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this book"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => commit(new Set(all.map((node) => node.key)))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => commit(new Set([root.key]))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Collapse all
          </button>
          {selectedKey !== root.key ? (
            <Link
              href={`/admin/books/${bookId}/content`}
              onClick={navigate}
              className="ml-auto rounded-lg px-2 py-2 text-xs font-semibold text-blue-700"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </div>

      <nav
        aria-label="Content tree"
        role="tree"
        onKeyDown={keyboard}
        className={`min-h-0 flex-1 overflow-y-auto p-3 ${pending ? "opacity-70" : ""}`}
      >
          <TreeBranch
          bookId={bookId}
          node={visible}
          siblings={[visible]}
          level={1}
          selectedKey={selectedKey}
          expanded={expanded}
          toggle={(key) => {
            const next = new Set(expanded);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            commit(next);
          }}
          navigate={navigate}
          startTransition={startTransition}
          activeAdd={activeAdd}
          setActiveAdd={(next) => {
            setActiveAdd(next);
            if (next.key) {
              setAddTitle("");
              setAddType(defaultChildType(next.type));
            }
          }}
          addTitle={addTitle}
          setAddTitle={setAddTitle}
            addType={addType}
            setAddType={setAddType}
            editingKey={editingKey}
            setEditingKey={setEditingKey}
            editTitle={editTitle}
            setEditTitle={setEditTitle}
          />
        {query && !realChildren(visible).length && !visible.title.toLowerCase().includes(query.toLowerCase()) ? (
          <p className="p-6 text-center text-sm text-slate-500">No matching content.</p>
        ) : null}
      </nav>
    </div>
  );
}

function TreeBranch({
  bookId,
  node,
  siblings,
  level,
  selectedKey,
  expanded,
  toggle,
  navigate,
  startTransition,
  activeAdd,
  setActiveAdd,
  addTitle,
  setAddTitle,
  addType,
  setAddType,
  editingKey,
  setEditingKey,
  editTitle,
  setEditTitle,
}: {
  bookId: string;
  node: ContentTreeNode;
  siblings: ContentTreeNode[];
  level: number;
  selectedKey: string;
  expanded: Set<string>;
  toggle: (key: string) => void;
  navigate: (event: MouseEvent) => void;
  startTransition: TransitionStartFunction;
  activeAdd: TreeActionsState;
  setActiveAdd: (next: TreeActionsState) => void;
  addTitle: string;
  setAddTitle: (value: string) => void;
  addType: string;
  setAddType: (value: string) => void;
  editingKey: string | null;
  setEditingKey: (value: string | null) => void;
  editTitle: string;
  setEditTitle: (value: string) => void;
}) {
  const children = realChildren(node);
  const open = expanded.has(node.key);
  const hasChildren = children.length > 0;
  const Icon = node.type === "BOOK" ? BookOpen : node.type === "TOPIC" || node.type === "MODULE" ? FileText : Folder;
  const selected = selectedKey === node.key || (node.type === "CHAPTER" && selectedKey.startsWith(`FOLDER:${node.id}:`));
  const draggable = node.type !== "BOOK";
  const addOptions = childTypesFor(node.type);
  const actionableType = node.type as BookStructureNodeType;

  function persistSiblingOrder(sourceId: string, targetId: string) {
    const sourceIndex = siblings.findIndex((entry) => entry.id === sourceId);
    const targetIndex = siblings.findIndex((entry) => entry.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const next = [...siblings];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    const type = actionableType;
    startTransition(async () => {
      await reorderContentBranchAction(
        bookId,
        type,
        next.map((entry) => entry.id),
      );
    });
  }

  function submitQuickAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = addTitle.trim();
    if (!activeAdd.key || !activeAdd.type || !title) return;
    const form = new FormData();
    form.set("type", addType || defaultChildType(activeAdd.type));
    form.set("title", title);
    startTransition(async () => {
      await createContentChildAction(bookId, activeAdd.type!, node.id, form);
      setActiveAdd({ key: null, type: null });
      setAddTitle("");
    });
  }

  return (
    <div role="treeitem" aria-level={level} aria-expanded={hasChildren ? open : undefined} aria-selected={selected}>
      <div
        draggable={draggable}
        onDragStart={(event) => {
          if (!draggable) return;
          event.dataTransfer.setData("text/plain", node.id);
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(event) => {
          if (!draggable) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          if (!draggable) return;
          event.preventDefault();
          const sourceId = event.dataTransfer.getData("text/plain");
          if (!sourceId || sourceId === node.id) return;
          persistSiblingOrder(sourceId, node.id);
        }}
        className={`group rounded-2xl border border-transparent ${
          selected ? "bg-blue-50/90" : "hover:border-slate-200 hover:bg-slate-50/80"
        }`}
      >
        <div className="flex items-center gap-1 px-2 py-1.5" style={{ paddingLeft: `${(level - 1) * 14 + 8}px` }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(node.key)}
              aria-label={`${open ? "Collapse" : "Expand"} ${node.title}`}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-white"
            >
              <ChevronRight className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`} />
            </button>
          ) : (
            <span className="w-9" />
          )}

          <span className={`rounded-lg p-1.5 text-slate-400 ${draggable ? "cursor-grab" : ""}`} aria-hidden>
            <GripVertical className="h-4 w-4" />
          </span>

          <Link
            data-tree-link
            href={`/admin/books/${bookId}/content?selected=${encodeURIComponent(node.key)}`}
            onClick={navigate}
            className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Icon className="h-4 w-4 shrink-0 text-slate-500" />
            <span className={`truncate font-medium ${node.archived ? "text-slate-400 line-through" : "text-slate-800"}`}>
              {node.title}
            </span>
          </Link>

          {node.type !== "FOLDER" ? (
            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              {childTypesFor(node.type).length ? (
                <button
                  type="button"
                  onClick={() => setActiveAdd({ key: activeAdd.key === node.key ? null : node.key, type: node.type })}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
                  aria-label={`Add child under ${node.title}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : null}
              {node.type !== "BOOK" ? <>
                <button type="button" onClick={() => { setEditingKey(node.key); setEditTitle(node.title); }} className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900" aria-label={`Edit ${node.title}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => {
                  if (!confirm(`Delete \"${node.title}\"?`)) return;
                  if (!confirm(`Permanently delete \"${node.title}\"? This cannot be undone.`)) return;
                  startTransition(async () => { await deleteContentNodeAction(bookId, actionableType, node.id, node.title); });
                }} className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-rose-700" aria-label={`Delete ${node.title}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => startTransition(async () => { await duplicateContentNodeAction(bookId, actionableType, node.id); })} className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900" aria-label={`Duplicate ${node.title}`}>
                  <Copy className="h-4 w-4" />
                </button>
              </> : null}
            </div>
          ) : null}
        </div>

        {editingKey === node.key ? (
          <form className="mx-3 mb-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!editTitle.trim() || node.type === "BOOK") return; startTransition(async () => { await renameContentNodeAction(bookId, actionableType, node.id, editTitle); setEditingKey(null); }); }}>
            <input autoFocus value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" aria-label={`Rename ${node.title}`} />
            <button type="submit" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Save</button>
            <button type="button" onClick={() => setEditingKey(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>
          </form>
        ) : null}

        {activeAdd.key === node.key && addOptions.length ? (
          <form onSubmit={submitQuickAdd} className="mx-3 mb-3 rounded-2xl border border-dashed border-slate-300 bg-white/90 p-3">
            <div className="grid gap-2">
              <select
                value={addType}
                onChange={(event) => setAddType(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {addOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                value={addTitle}
                onChange={(event) => setAddTitle(event.target.value)}
                placeholder="Title"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex gap-2">
                <button type="submit" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white">
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAdd({ key: null, type: null })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </div>

      {hasChildren && open ? (
        <div role="group">
          {children.map((child) => (
            <TreeBranch
              key={child.key}
              bookId={bookId}
              node={child}
              siblings={children}
              level={level + 1}
              selectedKey={selectedKey}
              expanded={expanded}
              toggle={toggle}
              navigate={navigate}
              startTransition={startTransition}
              activeAdd={activeAdd}
              setActiveAdd={setActiveAdd}
              addTitle={addTitle}
              setAddTitle={setAddTitle}
              addType={addType}
              setAddType={setAddType}
              editingKey={editingKey}
              setEditingKey={setEditingKey}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function filterTree(node: ContentTreeNode, query: string): ContentTreeNode {
  const children = realChildren(node)
    .map((child) => filterTree(child, query))
    .filter((child) => child.title.toLowerCase().includes(query) || child.children.length);
  return { ...node, children };
}

function childTypesFor(type: ContentNodeType) {
  const options: Record<ContentNodeType, string[]> = {
    BOOK: ["PART", "UNIT", "CHAPTER"],
    PART: ["UNIT", "CHAPTER"],
    UNIT: ["CHAPTER"],
    CHAPTER: ["MODULE", "TOPIC"],
    MODULE: ["TOPIC"],
    TOPIC: [],
    FOLDER: [],
  };
  return options[type] ?? [];
}

function defaultChildType(type: ContentNodeType | null) {
  return childTypesFor(type ?? "FOLDER")[0] ?? "CHAPTER";
}
