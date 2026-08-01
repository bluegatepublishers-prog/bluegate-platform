"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Pencil, Plus, Search } from "lucide-react";

export type ManagedMasterRow = {
  id: string; name: string; code: string; description: string | null;
  displayOrder: number; active: boolean; _count?: { values: number };
};

const empty = { name: "", code: "", description: "", displayOrder: 0, active: true };

export default function MasterDataManager({ title, singular, apiBase, initialRows, detailHrefBase, reservedHint }: {
  title: string; singular: string; apiBase: string; initialRows: ManagedMasterRow[];
  detailHrefBase?: string; reservedHint?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<ManagedMasterRow | null | undefined>(undefined);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => initialRows.filter((row) => {
    const match = `${row.name} ${row.code} ${row.description ?? ""}`.toLowerCase().includes(query.toLowerCase());
    return match && (status === "all" || (status === "active") === row.active);
  }), [initialRows, query, status]);

  function open(row?: ManagedMasterRow) {
    setEditing(row ?? null); setError(""); setMessage("");
    setForm(row ? { name: row.name, code: row.code, description: row.description ?? "", displayOrder: row.displayOrder, active: row.active } : empty);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const response = await fetch(editing ? `${apiBase}/${editing.id}` : apiBase, {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) { setError(body.message || `Unable to save ${singular.toLowerCase()}.`); return; }
    setEditing(undefined); setMessage(`${singular} ${editing ? "updated" : "created"}.`); router.refresh();
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-slate-900">{title}</h1><p className="mt-2 text-slate-600">Manage publisher-scoped {title.toLowerCase()} without deleting historical references.</p></div>
      <button type="button" onClick={() => open()} className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"><Plus className="mr-2 h-5 w-5"/>Add {singular}</button>
    </div>
    {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">{message}</p> : null}
    <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:grid-cols-[1fr_180px]">
      <label className="relative"><span className="sr-only">Search</span><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="w-full rounded-xl border py-3 pl-10 pr-4"/></label>
      <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-4 py-3"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
    </div>
    {!filtered.length ? <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-slate-500">No {title.toLowerCase()} match these filters.</div> : <>
      <div className="grid gap-4 md:hidden">{filtered.map((row) => <article key={row.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><h2 className="font-bold">{row.name}</h2><p className="text-sm text-slate-500">{row.code}</p></div><Status active={row.active}/></div>{row.description ? <p className="mt-3 text-sm text-slate-600">{row.description}</p> : null}<Actions row={row} open={open} detailHrefBase={detailHrefBase}/></article>)}</div>
      <div className="hidden overflow-hidden rounded-2xl border bg-white shadow-sm md:block"><table className="w-full"><thead className="bg-slate-50 text-left"><tr><th className="px-5 py-4">Name</th><th className="px-5 py-4">Code</th><th className="px-5 py-4">Order</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className="border-t"><td className="px-5 py-4"><strong>{row.name}</strong>{row._count ? <span className="ml-2 text-xs text-slate-500">{row._count.values} values</span> : null}<p className="max-w-md text-sm text-slate-500">{row.description}</p></td><td className="px-5 py-4 font-mono text-sm">{row.code}</td><td className="px-5 py-4">{row.displayOrder}</td><td className="px-5 py-4"><Status active={row.active}/></td><td className="px-5 py-4"><Actions row={row} open={open} detailHrefBase={detailHrefBase}/></td></tr>)}</tbody></table></div>
    </>}
    {editing !== undefined ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={`${editing ? "Edit" : "Add"} ${singular}`}><form onSubmit={save} className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-auto rounded-2xl bg-white p-6 shadow-xl"><div><h2 className="text-2xl font-bold">{editing ? "Edit" : "Add"} {singular}</h2>{reservedHint ? <p className="mt-2 text-sm text-slate-500">{reservedHint}</p> : null}</div>{error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}<div className="grid gap-4 sm:grid-cols-2"><Field label="Name"><input required value={form.name} onChange={(e) => setForm({...form, name:e.target.value})} className={fieldClass}/></Field><Field label="Code"><input required value={form.code} onChange={(e) => setForm({...form, code:e.target.value.toUpperCase().replace(/[^A-Z0-9]+/g,"_")})} className={fieldClass}/></Field><Field label="Display order"><input type="number" min="0" value={form.displayOrder} onChange={(e) => setForm({...form, displayOrder:Number(e.target.value)})} className={fieldClass}/></Field><label className="flex items-center gap-3 self-end rounded-xl border p-3"><input type="checkbox" checked={form.active} onChange={(e) => setForm({...form, active:e.target.checked})}/>Active</label></div><Field label="Description"><textarea rows={4} value={form.description} onChange={(e) => setForm({...form, description:e.target.value})} className={fieldClass}/></Field><div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(undefined)} className="rounded-xl border px-5 py-3 font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div></form></div> : null}
  </div>;
}

const fieldClass="mt-2 w-full rounded-xl border px-4 py-3";
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block text-sm font-semibold text-slate-700">{label}{children}</label>; }
function Status({active}:{active:boolean}) { return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{active ? "Active" : "Inactive"}</span>; }
function Actions({row,open,detailHrefBase}:{row:ManagedMasterRow;open:(row:ManagedMasterRow)=>void;detailHrefBase?:string}) { return <div className="mt-4 flex justify-end gap-2 md:mt-0"><button type="button" onClick={() => open(row)} aria-label={`Edit ${row.name}`} className="rounded-lg border p-2 text-slate-700"><Pencil className="h-4 w-4"/></button>{detailHrefBase ? <Link href={`${detailHrefBase}/${row.id}`} className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-semibold">Values<ArrowRight className="ml-2 h-4 w-4"/></Link> : null}</div>; }
