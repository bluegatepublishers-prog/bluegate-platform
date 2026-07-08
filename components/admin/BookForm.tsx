"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";

export default function BookForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    isbn: "",
    description: "",
    classId: "",
    subjectId: "",
    seriesId: "",
    featured: false,
    published: true,
    coverImage: "",
    samplePdf: "",
  });

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await fetch("/api/admin/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      alert("Book created successfully.");

      router.push("/admin/books");

      router.refresh();
    } catch (err) {
      console.error(err);

      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border bg-white p-8 shadow-sm"
    >
      <div>
        <label className="mb-2 block font-medium">
          Book Title
        </label>

        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Subtitle
        </label>

        <input
          name="subtitle"
          value={form.subtitle}
          onChange={handleChange}
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          ISBN
        </label>

        <input
          name="isbn"
          value={form.isbn}
          onChange={handleChange}
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Description
        </label>

        <textarea
          name="description"
          rows={5}
          value={form.description}
          onChange={handleChange}
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <label className="mb-2 block font-medium">
            Class ID
          </label>

          <input
            name="classId"
            value={form.classId}
            onChange={handleChange}
            required
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Subject ID
          </label>

          <input
            name="subjectId"
            value={form.subjectId}
            onChange={handleChange}
            required
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Series ID
          </label>

          <input
            name="seriesId"
            value={form.seriesId}
            onChange={handleChange}
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>
      </div>

      <div className="flex gap-8">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="featured"
            checked={form.featured}
            onChange={handleChange}
          />
          Featured
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="published"
            checked={form.published}
            onChange={handleChange}
          />
          Published
        </label>
      </div>

      <button
        disabled={loading}
        className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-5 w-5" />
            Save Book
          </>
        )}
      </button>
    </form>
  );
}