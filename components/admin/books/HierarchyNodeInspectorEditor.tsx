"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type NodeType = "PART" | "UNIT" | "CHAPTER" | "MODULE" | "TOPIC";
type OrderField = "displayOrder" | "sortOrder";

type InspectorNode = {
  id: string;
  nodeType: NodeType;
  title: string;
  description: string | null;
  published: boolean;
  orderValue: number | null;
  parentBookTitle: string;
  parentNodeTitle: string | null;
  apiEndpoint: string;
  orderField: OrderField;
};

type FormValue = {
  title: string;
  description: string;
  published: boolean;
  orderValue: string;
};

export default function HierarchyNodeInspectorEditor({
  node,
}: {
  node: InspectorNode;
}) {
  const router = useRouter();
  const incoming = useMemo(() => formValue(node), [node]);
  const [baseline, setBaseline] = useState(incoming);
  const [form, setForm] = useState(incoming);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setBaseline(incoming);
    setForm(incoming);
    setError("");
  }, [incoming]);

  const titleError = form.title.trim() ? "" : "Title is required.";
  const orderError = validOrder(form.orderValue)
    ? ""
    : "Order must be a non-negative integer.";
  const dirty =
    form.title !== baseline.title ||
    form.description !== baseline.description ||
    form.published !== baseline.published ||
    form.orderValue !== baseline.orderValue;

  function update<K extends keyof FormValue>(key: K, value: FormValue[K]) {
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

    const normalized: FormValue = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      orderValue: form.orderValue.trim(),
    };
    if (!normalized.title || !validOrder(normalized.orderValue)) {
      setForm(normalized);
      setError("Correct the highlighted fields before saving.");
      return;
    }

    const changes: Record<string, string | number | boolean> = {};
    if (normalized.title !== baseline.title) changes.title = normalized.title;
    if (normalized.description !== baseline.description) {
      changes.description = normalized.description;
    }
    if (normalized.published !== baseline.published) {
      changes.published = normalized.published;
    }
    if (normalized.orderValue !== baseline.orderValue) {
      changes[node.orderField] = Number(normalized.orderValue);
    }
    if (!Object.keys(changes).length) {
      setForm(normalized);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(node.apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      if (!response.ok) {
        setError(payload?.message || `Unable to save ${nodeLabel(node.nodeType)} changes.`);
        return;
      }
      setBaseline(normalized);
      setForm(normalized);
      setSuccess(`${nodeLabel(node.nodeType)} changes saved.`);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-5" noValidate>
      <Section title="Basic Information">
        <Field label="Title" error={titleError} errorId="node-title-error">
          <input
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            required
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? "node-title-error" : undefined}
            className={inputClass(Boolean(titleError))}
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
      </Section>

      <Section title="Position">
        <Field
          label={node.orderField === "sortOrder" ? "Sort order" : "Display order"}
          error={orderError}
          errorId="node-order-error"
        >
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={form.orderValue}
            onChange={(event) => update("orderValue", event.target.value)}
            aria-invalid={Boolean(orderError)}
            aria-describedby={orderError ? "node-order-error" : undefined}
            className={inputClass(Boolean(orderError))}
          />
        </Field>
      </Section>

      <Section title="Publishing">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          Published
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) => update("published", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
        </label>
      </Section>

      <Section title="Context">
        <ReadOnly label="Node type" value={nodeLabel(node.nodeType)} />
        <ReadOnly label="Parent book" value={node.parentBookTitle} />
        <ReadOnly label="Parent node" value={node.parentNodeTitle ?? "—"} />
        <ReadOnly label="Node ID" value={node.id} mono />
      </Section>

      <div className="border-t border-slate-200 pt-4">
        {error ? (
          <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            {success}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!dirty || saving || Boolean(titleError || orderError)}
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
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  error,
  errorId,
  children,
}: {
  label: string;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {label}
      {children}
      {error ? (
        <span id={errorId} className="mt-1 block text-xs text-rose-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function ReadOnly({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-1 break-words text-xs font-semibold text-slate-700 ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function formValue(node: InspectorNode): FormValue {
  return {
    title: node.title,
    description: node.description ?? "",
    published: node.published,
    orderValue: node.orderValue === null ? "" : String(node.orderValue),
  };
}

function validOrder(value: string) {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) && Number.isSafeInteger(Number(trimmed));
}

function nodeLabel(type: NodeType) {
  return type[0] + type.slice(1).toLowerCase();
}

function inputClass(invalid = false) {
  return `mt-1.5 w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 ${
    invalid
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
      : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"
  }`;
}
