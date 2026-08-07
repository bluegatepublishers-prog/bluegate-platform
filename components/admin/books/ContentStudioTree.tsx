"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type {
  KeyboardEvent,
  MouseEvent,
  TransitionStartFunction,
} from "react";
import {
  BookOpen,
  ChevronRight,
  Copy,
  FileText,
  Folder,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  createContentChildAction,
  deleteContentNodeAction,
  duplicateContentNodeAction,
  renameContentNodeAction,
  reorderContentBranchAction,
} from "@/app/admin/books/[id]/content/actions";
import {
  flattenContentTree,
  type ContentNodeType,
  type ContentTreeNode,
} from "@/lib/content-studio-tree";
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

  const selectedPathKeys = useMemo(
    () =>
      new Set(
        findPath(root, selectedKey).map((node) => node.key),
      ),
    [root, selectedKey],
  );

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([root.key, ...selectedPathKeys]),
  );

  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const [activeAdd, setActiveAdd] = useState<TreeActionsState>({
    key: null,
    type: null,
  });

  const [addTitle, setAddTitle] = useState("");
  const [addType, setAddType] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = sessionStorage.getItem(storageKey);
        const next = stored
          ? new Set(JSON.parse(stored) as string[])
          : new Set<string>();

        next.add(root.key);

        for (const key of selectedPathKeys) {
          next.add(key);
        }

        setExpanded(next);
      } catch {
        setExpanded(new Set([root.key, ...selectedPathKeys]));
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [root.key, selectedPathKeys, storageKey]);

  function commit(next: Set<string>) {
    setExpanded(next);

    try {
      sessionStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {}
  }

  const all = useMemo(
    () =>
      flattenContentTree(root).filter(
        (node) => node.type !== "FOLDER",
      ),
    [root],
  );

  const visible = useMemo(
    () =>
      query.trim()
        ? filterTree(root, query.toLowerCase())
        : root,
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
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    const links = [
      ...event.currentTarget.querySelectorAll<HTMLAnchorElement>(
        "a[data-tree-link]",
      ),
    ];

    const index = links.indexOf(
      document.activeElement as HTMLAnchorElement,
    );

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
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search hierarchy"
            className="h-7 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-[10px] text-slate-700 outline-none focus:border-blue-400"
          />
        </div>

        <div className="mt-1.5 flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              commit(new Set(all.map((node) => node.key)))
            }
            className="h-6 rounded-md border border-slate-200 px-2 text-[9px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            Expand
          </button>

          <button
            type="button"
            onClick={() =>
              commit(new Set([root.key, ...selectedPathKeys]))
            }
            className="h-6 rounded-md border border-slate-200 px-2 text-[9px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            Collapse
          </button>

          {selectedKey !== root.key ? (
            <Link
              href={`/admin/books/${bookId}/content`}
              onClick={navigate}
              className="ml-auto px-1.5 text-[9px] font-semibold text-blue-700"
            >
              Book root
            </Link>
          ) : null}
        </div>
      </div>

      <nav
        aria-label="Content tree"
        role="tree"
        onKeyDown={keyboard}
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1.5 ${
          pending ? "opacity-70" : ""
        }`}
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

        {query &&
        !realChildren(visible).length &&
        !visible.title.toLowerCase().includes(query.toLowerCase()) ? (
          <p className="p-4 text-center text-[10px] text-slate-500">
            No matching content.
          </p>
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

  const Icon =
    node.type === "BOOK"
      ? BookOpen
      : node.type === "TOPIC" || node.type === "MODULE"
        ? FileText
        : Folder;

  const selected =
    selectedKey === node.key ||
    (node.type === "CHAPTER" &&
      selectedKey.startsWith(`FOLDER:${node.id}:`));

  const draggable = node.type !== "BOOK";
  const addOptions = childTypesFor(node.type);
  const actionableType = node.type as BookStructureNodeType;

  function persistSiblingOrder(sourceId: string, targetId: string) {
    const sourceIndex = siblings.findIndex((entry) => entry.id === sourceId);
    const targetIndex = siblings.findIndex((entry) => entry.id === targetId);

    if (
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex === targetIndex
    ) {
      return;
    }

    const next = [...siblings];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);

    startTransition(async () => {
      await reorderContentBranchAction(
        bookId,
        actionableType,
        next.map((entry) => entry.id),
      );
    });
  }

  function submitQuickAdd(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const title = addTitle.trim();

    if (!activeAdd.key || !activeAdd.type || !title) return;

    const form = new FormData();
    form.set(
      "type",
      addType || defaultChildType(activeAdd.type),
    );
    form.set("title", title);

    startTransition(async () => {
      try {
        const created =
          await createContentChildAction(
            bookId,
            activeAdd.type!,
            node.id,
            form,
          );

        setActiveAdd({
          key: null,
          type: null,
        });

        setAddTitle("");

        if (created?.id && created?.type) {
          const createdKey =
            `${created.type}:${created.id}`;

          window.location.assign(
            `/admin/books/${bookId}/content?selected=${encodeURIComponent(
              createdKey,
            )}`,
          );
        }
      } catch (cause) {
        window.alert(
          cause instanceof Error
            ? cause.message
            : "Unable to create this hierarchy item.",
        );
      }
    });
  }

  return (
    <div
      role="treeitem"
      aria-level={level}
      aria-expanded={hasChildren ? open : undefined}
      aria-selected={selected}
    >
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

          const sourceId =
            event.dataTransfer.getData("text/plain");

          if (!sourceId || sourceId === node.id) return;

          persistSiblingOrder(sourceId, node.id);
        }}
        className={`group relative rounded-md ${
          selected ? "bg-blue-50" : "hover:bg-slate-50"
        }`}
      >
        <div
          className="flex min-w-0 items-start"
          style={{
            paddingLeft: `${Math.max(2, (level - 1) * 11)}px`,
          }}
        >
          <div className="flex h-7 w-5 shrink-0 items-center justify-center">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggle(node.key)}
                aria-label={`${open ? "Collapse" : "Expand"} ${node.title}`}
                className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-700"
              >
                <ChevronRight
                  className={`h-3 w-3 transition ${
                    open ? "rotate-90" : ""
                  }`}
                />
              </button>
            ) : (
              <span className="h-5 w-5" />
            )}
          </div>

          <span
            className={`mt-1 flex h-5 w-4 shrink-0 items-center justify-center text-slate-300 opacity-0 transition group-hover:opacity-100 ${
              draggable ? "cursor-grab" : ""
            }`}
            aria-hidden
          >
            <GripVertical className="h-3 w-3" />
          </span>

          <Link
            data-tree-link
            href={
              level === 1 && node.type === "BOOK"
                ? `/admin/books/${bookId}/content`
                : `/admin/books/${bookId}/content?selected=${encodeURIComponent(node.key)}`
            }
            onClick={navigate}
            title={node.title}
            className="flex min-w-0 flex-1 items-start gap-1.5 py-1 pr-1 text-[11px] leading-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          >
            <Icon
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                selected ? "text-blue-700" : "text-slate-400"
              }`}
            />

            <span
              className={`min-w-0 break-words font-medium ${
                node.archived
                  ? "text-slate-400 line-through"
                  : selected
                    ? "font-semibold text-blue-800"
                    : "text-slate-700"
              }`}
            >
              {node.title}
            </span>
          </Link>

          {node.type !== "FOLDER" ? (
            <div className="mr-0.5 mt-0.5 flex shrink-0 items-center opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              {childTypesFor(node.type).length ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveAdd({
                      key:
                        activeAdd.key === node.key
                          ? null
                          : node.key,
                      type: node.type,
                    })
                  }
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-blue-700"
                  aria-label={`Add child under ${node.title}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              ) : null}

              {node.type !== "BOOK" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKey(node.key);
                      setEditTitle(node.title);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-700"
                    aria-label={`Edit ${node.title}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await duplicateContentNodeAction(
                          bookId,
                          actionableType,
                          node.id,
                        );
                      })
                    }
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-700"
                    aria-label={`Duplicate ${node.title}`}
                  >
                    <Copy className="h-3 w-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(`Delete "${node.title}"?`)) return;

                      if (
                        !confirm(
                          `Permanently delete "${node.title}"? This cannot be undone.`,
                        )
                      ) {
                        return;
                      }

                      startTransition(async () => {
                        const result =
                          await deleteContentNodeAction(
                            bookId,
                            actionableType,
                            node.id,
                            node.title,
                          );

                        if (!result.ok) {
                          window.alert(result.message);
                          return;
                        }

                        if (selectedKey === node.key) {
                          window.location.assign(
                            `/admin/books/${bookId}/content`,
                          );
                        }
                      });
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-rose-700"
                    aria-label={`Delete ${node.title}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {editingKey === node.key ? (
          <form
            className="mb-1.5 ml-8 mr-1 flex gap-1"
            onSubmit={(event) => {
              event.preventDefault();

              if (!editTitle.trim() || node.type === "BOOK") return;

              startTransition(async () => {
                await renameContentNodeAction(
                  bookId,
                  actionableType,
                  node.id,
                  editTitle,
                );

                setEditingKey(null);
              });
            }}
          >
            <input
              autoFocus
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-[10px] outline-none focus:border-blue-400"
              aria-label={`Rename ${node.title}`}
            />

            <button
              type="submit"
              className="h-7 rounded-md bg-slate-900 px-2 text-[9px] font-semibold text-white"
            >
              Save
            </button>

            <button
              type="button"
              onClick={() => setEditingKey(null)}
              className="h-7 rounded-md border border-slate-200 px-2 text-[9px] font-semibold text-slate-500"
            >
              Cancel
            </button>
          </form>
        ) : null}

        {activeAdd.key === node.key && addOptions.length ? (
          <form
            onSubmit={submitQuickAdd}
            className="mb-1.5 ml-8 mr-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm"
          >
            <div className="grid gap-1">
              <select
                value={addType}
                onChange={(event) => setAddType(event.target.value)}
                className="h-7 rounded-md border border-slate-200 px-2 text-[10px] outline-none focus:border-blue-400"
              >
                {addOptions.map((option) => (
                  <option key={option} value={option}>
                    {prettyType(option)}
                  </option>
                ))}
              </select>

              <input
                value={addTitle}
                onChange={(event) => setAddTitle(event.target.value)}
                placeholder="Name"
                className="h-7 rounded-md border border-slate-200 px-2 text-[10px] outline-none focus:border-blue-400"
              />

              <div className="flex gap-1">
                <button
                  type="submit"
                  className="h-6 rounded-md bg-slate-900 px-2 text-[9px] font-semibold text-white"
                >
                  Add
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveAdd({
                      key: null,
                      type: null,
                    })
                  }
                  className="h-6 rounded-md border border-slate-200 px-2 text-[9px] font-semibold text-slate-500"
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

function filterTree(
  node: ContentTreeNode,
  query: string,
): ContentTreeNode {
  const children = realChildren(node)
    .map((child) => filterTree(child, query))
    .filter(
      (child) =>
        child.title.toLowerCase().includes(query) ||
        child.children.length,
    );

  return {
    ...node,
    children,
  };
}

function childTypesFor(type: ContentNodeType) {
  const options: Record<ContentNodeType, string[]> = {
    BOOK: ["PART"],
    PART: ["UNIT"],
    UNIT: ["CHAPTER"],
    CHAPTER: ["MODULE"],
    MODULE: [],
    TOPIC: [],
    FOLDER: [],
  };

  return options[type] ?? [];
}

function defaultChildType(type: ContentNodeType | null) {
  return childTypesFor(type ?? "FOLDER")[0] ?? "CHAPTER";
}

function prettyType(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function findPath(
  root: ContentTreeNode,
  key: string,
): ContentTreeNode[] {
  if (root.key === key) return [root];

  for (const child of root.children) {
    const path = findPath(child, key);

    if (path.length) {
      return [root, ...path];
    }
  }

  return [];
}