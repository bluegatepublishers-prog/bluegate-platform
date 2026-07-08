"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookForm from "@/components/admin/books/BookForm";

interface Option {
  id: string;
  name: string;
}

export default function NewBookPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [series, setSeries] = useState<Option[]>([]);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    isbn: "",
    description: "",

    coverImage: "",
    samplePdf: "",

    classId: "",
    subjectId: "",
    seriesId: "",

    featured: false,
    published: true,
  });

  useEffect(() => {
    async function loadData() {
      const [classesRes, subjectsRes, seriesRes] =
        await Promise.all([
          fetch("/api/admin/master/classes"),
          fetch("/api/admin/master/subjects"),
          fetch("/api/admin/master/series"),
        ]);

      setClasses(await classesRes.json());
      setSubjects(await subjectsRes.json());
      setSeries(await seriesRes.json());
    }

    loadData();
  }, []);

  function onChange(
    field: string,
    value: string | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

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
        body: JSON.stringify(form),
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
        loading={loading}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}