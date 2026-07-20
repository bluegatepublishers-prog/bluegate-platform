"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "create" | "edit";

type Entity = {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  active: boolean;
  description?: string | null;
};

export default function MasterEntityForm({
  apiBase,
  title,
  mode,
  id,
  includeDescription = false,
}: {
  apiBase: string;
  title: string;
  mode: Mode;
  id?: string;
  includeDescription?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    sortOrder: 0,
    active: true,
    description: "",
  });

  useEffect(() => {
    if (mode !== "edit" || !id) return;

    let ignore = false;

    async function load() {
      const response = await fetch(`${apiBase}/${id}`);
      if (!response.ok) return;
      const data: Entity = await response.json();
      if (ignore) return;
      setForm({
        name: data.name ?? "",
        code: data.code ?? "",
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
        description: data.description ?? "",
      });
    }

    load();

    return () => {
      ignore = true;
    };
  }, [apiBase, id, mode]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(mode === "create" ? apiBase : `${apiBase}/${id}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.message || "Unable to save record.");
      }

      router.push(apiBase.replace("/api/admin", "/admin"));
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save record.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border bg-white p-8 shadow-sm">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Name">
          <input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className={input} />
        </Field>
        <Field label="Code">
          <input required value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} className={input} />
        </Field>
        <Field label="Sort Order">
          <input type="number" value={form.sortOrder} onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))} className={input} />
        </Field>
        {includeDescription ? (
          <Field label="Description">
            <textarea rows={4} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className={input} />
          </Field>
        ) : null}
      </div>

      <label className="flex items-center gap-3">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))} />
        Active
      </label>

      <button disabled={loading} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50">
        {loading ? "Saving..." : `${mode === "create" ? "Create" : "Update"} ${title}`}
      </button>
    </form>
  );
}

const input = "mt-2 w-full rounded-xl border px-4 py-3";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-semibold text-slate-700">{label}{children}</label>;
}