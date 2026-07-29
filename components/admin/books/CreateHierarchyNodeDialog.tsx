"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type NodeType = "PART" | "UNIT" | "CHAPTER" | "MODULE" | "TOPIC";
type ParentType = "BOOK" | NodeType;

export type HierarchyCreateOption = {
  nodeType: NodeType;
  endpoint: string;
  bookId: string;
  parentType: ParentType;
  parentId: string;
  parentTitle: string;
};

export default function CreateHierarchyNodeDialog({
  options,
}: {
  options: HierarchyCreateOption[];
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<NodeType>(
    options[0]?.nodeType ?? "PART",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selected =
    options.find((option) => option.nodeType === selectedType) ?? options[0];
  const optionKey = useMemo(
    () => options.map((option) => option.nodeType).join(":"),
    [options],
  );

  useEffect(() => {
    setSelectedType(options[0]?.nodeType ?? "PART");
    setOpen(false);
    resetForm();
  }, [optionKey, options]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => titleRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, selectedType]);

  if (!selected) return null;

  function resetForm() {
    setTitle("");
    setDescription("");
    setPublished(false);
    setError("");
  }

  function close() {
    if (saving) return;
    setOpen(false);
    resetForm();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !selected) return;
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    if (!normalizedTitle) {
      setTitle(normalizedTitle);
      setError("Title is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(selected.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: selected.bookId,
          parentType: selected.parentType,
          parentId: selected.parentId,
          title: normalizedTitle,
          description: normalizedDescription || null,
          published,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      if (!response.ok) {
        setError(payload?.message || `Unable to create ${nodeLabel(selected.nodeType)}.`);
        return;
      }
      setSuccess(`${nodeLabel(selected.nodeType)} created.`);
      setOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError("");
          setSuccess("");
        }}
        aria-haspopup="dialog"
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-blue-700 outline-none transition hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {options.length === 1
          ? `+ ${nodeLabel(options[0].nodeType)}`
          : "+ Add"}
      </button>
      {success ? (
        <span role="status" className="sr-only">
          {success}
        </span>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-node-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 id="create-node-title" className="font-bold text-slate-950">
                  Add hierarchy node
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Parent: {selected.parentTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={saving}
                aria-label="Close create hierarchy node dialog"
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4 p-4" noValidate>
              {options.length > 1 ? (
                <label className="block text-xs font-semibold text-slate-600">
                  Node type
                  <select
                    value={selected.nodeType}
                    onChange={(event) => {
                      setSelectedType(event.target.value as NodeType);
                      setError("");
                    }}
                    disabled={saving}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {options.map((option) => (
                      <option key={option.nodeType} value={option.nodeType}>
                        {nodeLabel(option.nodeType)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Parent context
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {parentLabel(selected.parentType)} · {selected.parentTitle}
                </p>
              </div>

              <label className="block text-xs font-semibold text-slate-600">
                Title
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setError("");
                  }}
                  required
                  aria-invalid={Boolean(error && !title.trim())}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-600">
                Description
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={saving}
                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                Published
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(event) => setPublished(event.target.checked)}
                  disabled={saving}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </label>

              {error ? (
                <p
                  role="alert"
                  className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={close}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {saving
                    ? "Creating…"
                    : `Create ${nodeLabel(selected.nodeType)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function nodeLabel(type: NodeType) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function parentLabel(type: ParentType) {
  return type === "BOOK" ? "Book" : nodeLabel(type);
}
