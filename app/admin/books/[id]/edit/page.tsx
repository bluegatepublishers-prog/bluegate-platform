"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookForm from "@/components/admin/books/BookForm";
import type { BookFormData } from "@/types/book-form";
import {
  createEmptyBookFormData,
  parseBookFormData,
  toVisibleBookFormPayload,
} from "@/lib/book-form-data";
import type {
  BookFormChangeHandler,
  SelectOption,
} from "@/types/admin-book";

export default function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [classes, setClasses] = useState<SelectOption[]>([]);
  const [subjects, setSubjects] = useState<SelectOption[]>([]);
  const [series, setSeries] = useState<SelectOption[]>([]);

  const [form, setForm] = useState<BookFormData>(
    createEmptyBookFormData
  );

  useEffect(() => {
    async function loadData() {
      const [bookRes, classesRes, subjectsRes, seriesRes] =
        await Promise.all([
          fetch(`/api/admin/books/${id}`),
          fetch("/api/admin/master/classes"),
          fetch("/api/admin/master/subjects"),
          fetch("/api/admin/master/series"),
        ]);

      const book = await bookRes.json();

      setClasses(await classesRes.json());
      setSubjects(await subjectsRes.json());
      setSeries(await seriesRes.json());

      setForm(parseBookFormData(book));
    }

    loadData();
  }, [id]);

  const onChange: BookFormChangeHandler = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  async function onSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/books/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toVisibleBookFormPayload(form)),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Unable to update book.");
        return;
      }

      alert("Book updated successfully.");

      router.push("/admin/books");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Edit Book
        </h1>

        <p className="mt-2 text-slate-600">
          Update Bluegate publication.
        </p>
      </div>

      <BookForm
        title="Update Book"
        form={form}
        classes={classes}
        subjects={subjects}
        series={series}
        loading={loading}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
