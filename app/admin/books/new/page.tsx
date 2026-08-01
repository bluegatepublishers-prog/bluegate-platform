"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookForm from "@/components/admin/books/BookForm";
import type { BookFormData } from "@/types/book-form";
import { createEmptyBookFormData, toVisibleBookFormPayload } from "@/lib/book-form-data";
import type {
  BookFormChangeHandler,
  SelectOption,
} from "@/types/admin-book";

export default function NewBookPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [classes, setClasses] = useState<SelectOption[]>([]);
  const [subjects, setSubjects] = useState<SelectOption[]>([]);
  const [series, setSeries] = useState<SelectOption[]>([]);
  const [boards, setBoards] = useState<SelectOption[]>([]);

  const [form, setForm] = useState<BookFormData>(
    createEmptyBookFormData
  );

  useEffect(() => {
    async function loadData() {
      const [classesRes, subjectsRes, seriesRes, boardsRes] =
        await Promise.all([
          fetch("/api/admin/master/classes"),
          fetch("/api/admin/master/subjects"),
          fetch("/api/admin/master/series"),
          fetch("/api/admin/master/boards"),
        ]);

      setClasses(await classesRes.json());
      setSubjects(await subjectsRes.json());
      setSeries(await seriesRes.json());
      setBoards(await boardsRes.json());
    }

    loadData();
  }, []);

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
      const res = await fetch("/api/admin/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toVisibleBookFormPayload(form)),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Unable to save book.");
        return;
      }

      alert("Book created successfully.");

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
          Add New Book
        </h1>

        <p className="mt-2 text-slate-600">
          Create a new Bluegate publication.
        </p>
      </div>

      <BookForm
        title="Save Book"
        form={form}
        classes={classes}
        subjects={subjects}
        series={series}
        boards={boards}
        loading={loading}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
