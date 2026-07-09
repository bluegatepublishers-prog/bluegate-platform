"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewResourcePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", subject: "", classLevel: "",
    type: "PDF", fileUrl: "", thumbnail: "", featured: false, published: true,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/admin/resources", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!response.ok) return alert((await response.json()).message);
    router.push("/admin/resources");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Add Resource</h1>
      <form onSubmit={submit} className="mt-8 space-y-6 rounded-2xl border bg-white p-8">
        {(["title", "subject", "classLevel", "fileUrl", "thumbnail"] as const).map((field) => (
          <input key={field} required={field !== "thumbnail"} value={form[field]}
            placeholder={field} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="w-full rounded-xl border px-4 py-3" />
        ))}
        <textarea value={form.description} placeholder="Description"
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-xl border px-4 py-3" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="w-full rounded-xl border px-4 py-3">
          {["PDF", "PPT", "DOC", "VIDEO", "ZIP"].map((type) => <option key={type}>{type}</option>)}
        </select>
        <label className="flex gap-3"><input type="checkbox" checked={form.featured}
          onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
        <label className="flex gap-3"><input type="checkbox" checked={form.published}
          onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published</label>
        <button disabled={saving} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">
          {saving ? "Saving..." : "Save Resource"}
        </button>
      </form>
    </main>
  );
}
