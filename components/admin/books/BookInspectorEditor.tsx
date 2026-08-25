"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InspectorBook = {
  id: string;
  title: string;
  subtitle: string;
  classId: string;
  subjectId: string;
  seriesId: string;
  boardId: string;
  isbn: string;
  published: boolean;
  publicCatalogueVisible: boolean;
  featured: boolean;
  description: string;
  updatedAt: string;
};

type Option = {
  id: string;
  name: string;
};

type EditableBook = Omit<InspectorBook, "id" | "updatedAt">;

export default function BookInspectorEditor({
  book,
  classes,
  subjects,
  series,
  boards,
}: {
  book: InspectorBook;
  classes: Option[];
  subjects: Option[];
  series: Option[];
  boards: Option[];
}) {
  const router = useRouter();
  const incoming = useMemo(() => editableValue(book), [book]);
  const [baseline, setBaseline] = useState<EditableBook>(incoming);
  const [form, setForm] = useState<EditableBook>(incoming);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const changes = useMemo(() => changedFields(baseline, form), [baseline, form]);
  const dirty = Object.keys(changes).length > 0;
  const titleError = form.title.trim() ? "" : "Title is required.";

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update<K extends keyof EditableBook>(key: K, value: EditableBook[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  function cancel() {
    setForm(baseline);
    setError("");
    setSuccess("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !dirty) return;
    const normalized = normalize(form);
    if (!normalized.title) {
      setForm(normalized);
      setError("Correct the highlighted field before saving.");
      return;
    }

    const inspectorChanges = changedFields(baseline, normalized);
    if (!Object.keys(inspectorChanges).length) {
      setForm(normalized);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/books/${book.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspectorChanges }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      if (!response.ok) {
        setError(payload?.message || "Unable to save book changes.");
        return;
      }
      setBaseline(normalized);
      setForm(normalized);
      setSuccess("Book changes saved.");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} data-content-editor-dirty={dirty ? "true" : "false"} className="mt-4 space-y-5" noValidate>
      <InspectorSection title="Basic Information">
        <Field label="Title" error={titleError}>
          <input
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            required
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? "book-title-error" : undefined}
            className={inputClass(Boolean(titleError))}
          />
        </Field>
        <Field label="Subtitle">
          <input
            value={form.subtitle}
            onChange={(event) => update("subtitle", event.target.value)}
            className={inputClass()}
          />
        </Field>
        <Field label="ISBN">
          <input
            value={form.isbn}
            onChange={(event) => update("isbn", event.target.value)}
            className={inputClass()}
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className={`${inputClass()} resize-y`}
          />
        </Field>
      </InspectorSection>

      <InspectorSection title="Classification">
        <Field label="Class">
          <select
            value={form.classId}
            onChange={(event) => update("classId", event.target.value)}
            required
            className={inputClass()}
          >
            {classes.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Subject">
          <select
            value={form.subjectId}
            onChange={(event) => update("subjectId", event.target.value)}
            required
            className={inputClass()}
          >
            {subjects.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Series">
          <select
            value={form.seriesId}
            onChange={(event) => update("seriesId", event.target.value)}
            className={inputClass()}
          >
            <option value="">No series</option>
            {series.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Board">
          <select value={form.boardId} onChange={(event) => update("boardId", event.target.value)} className={inputClass()}>
            <option value="">No normalized Board</option>
            {boards.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </Field>
      </InspectorSection>

      <InspectorSection title="Publishing">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          Published
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) => update("published", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
        </label>
        <label className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          <span className="flex items-center justify-between gap-3">
            Public Website Catalogue
            <input
              type="checkbox"
              checked={form.publicCatalogueVisible}
              onChange={(event) => update("publicCatalogueVisible", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
          </span>
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Show this book on the Bluegate website only; platform access is unchanged.
          </span>
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          Featured
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => update("featured", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
        </label>
      </InspectorSection>

      <div className="border-t border-slate-200 pt-4">
        {error ? <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
        {success ? <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{success}</p> : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!dirty || saving || Boolean(titleError)}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={!dirty || saving}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-45"
          >
            Cancel
          </button>
        </div>
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Book ID</dt>
            <dd className="mt-1 break-all font-mono text-slate-600">{book.id}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Last updated</dt>
            <dd className="mt-1 text-slate-600">{formatDate(book.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </form>
  );
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {label}
      {children}
      {error ? <span id="book-title-error" className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

function editableValue(book: InspectorBook): EditableBook {
  return {
    title: book.title,
    subtitle: book.subtitle,
    classId: book.classId,
    subjectId: book.subjectId,
    seriesId: book.seriesId,
    boardId: book.boardId,
    isbn: book.isbn,
    published: book.published,
    publicCatalogueVisible: book.publicCatalogueVisible,
    featured: book.featured,
    description: book.description,
  };
}

function normalize(value: EditableBook): EditableBook {
  return {
    ...value,
    title: value.title.trim(),
    subtitle: value.subtitle.trim(),
    isbn: value.isbn.trim(),
    description: value.description.trim(),
  };
}

function changedFields(previous: EditableBook, current: EditableBook) {
  const changes: Partial<EditableBook> = {};
  for (const key of Object.keys(previous) as (keyof EditableBook)[]) {
    if (previous[key] !== current[key]) {
      Object.assign(changes, { [key]: current[key] });
    }
  }
  return changes;
}

function inputClass(invalid = false) {
  return `mt-1.5 w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 ${
    invalid
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
      : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"
  }`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
