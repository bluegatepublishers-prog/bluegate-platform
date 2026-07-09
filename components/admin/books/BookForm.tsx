"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Save,
  Upload,
  ImageIcon,
  FileText,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface Option {
  id: string;
  name: string;
}

interface BookFormProps {
  title: string;

  form: {
  // Basic Information
  title: string;
  subtitle: string;
  isbn: string;
  description: string;
  aboutBook: string;

  // Book Details
  pages: number | "";
  edition: string;
  language: string;
  board: string;
  price: number | "";

  // Media
  coverImage: string;
  samplePdf: string;
  galleryImages: string[];

  // Dynamic Sections
  features: string[];
  learningOutcomes: string[];
  tableOfContents: string[];

  // Academic
  classId: string;
  subjectId: string;
  seriesId: string;

  // Status
  featured: boolean;
  published: boolean;
};

  classes: Option[];
  subjects: Option[];
  series: Option[];

  loading: boolean;

  onChange: (
  field: string,
  value:
    | string
    | number
    | boolean
    | string[]
) => void;

  onSubmit: (
    e: React.FormEvent<HTMLFormElement>
  ) => void;
}

export default function BookForm({
  title,
  form,
  classes,
  subjects,
  series,
  loading,
  onChange,
  onSubmit,
}: BookFormProps) {
  const [uploadingCover, setUploadingCover] =
    useState(false);

  const [uploadingPdf, setUploadingPdf] =
  useState(false);

  async function uploadFile(
    file: File,
    field: "coverImage" | "samplePdf"
  ) {
    const formData = new FormData();

    formData.append("file", file);

    if (field === "coverImage") {
      setUploadingCover(true);
    } else {
      setUploadingPdf(true);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Upload failed.");
        return;
      }

      onChange(field, data.url);
    } catch (error) {
      console.error(error);
      alert("Upload failed.");
    } finally {
      if (field === "coverImage") {
        setUploadingCover(false);
      } else {
        setUploadingPdf(false);
      }
    }
  }

  function addItem(
  field:
    | "features"
    | "learningOutcomes"
    | "tableOfContents"
) {
  onChange(field, [...form[field], ""]);
}

function updateItem(
  field:
    | "features"
    | "learningOutcomes"
    | "tableOfContents",
  index: number,
  value: string
) {
  const items = [...form[field]];
  items[index] = value;
  onChange(field, items);
}

function removeItem(
  field:
    | "features"
    | "learningOutcomes"
    | "tableOfContents",
  index: number
) {
  const items = [...form[field]];
  items.splice(index, 1);
  onChange(field, items);
}

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8"
    >
            {/* ==========================================
          BOOK INFORMATION
      =========================================== */}

      <div className="rounded-2xl border bg-white p-8 shadow-sm">

        <h2 className="mb-6 text-2xl font-bold">
          Book Information
        </h2>

        <div className="grid gap-6 md:grid-cols-2">

          {/* Title */}

          <div>
            <label className="mb-2 block font-medium">
              Title <span className="text-red-500">*</span>
            </label>

            <input
              required
              type="text"
              value={form.title}
              onChange={(e) =>
                onChange("title", e.target.value)
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Subtitle */}

          <div>
            <label className="mb-2 block font-medium">
              Subtitle
            </label>

            <input
              type="text"
              value={form.subtitle}
              onChange={(e) =>
                onChange("subtitle", e.target.value)
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* ISBN */}

          <div>
            <label className="mb-2 block font-medium">
              ISBN
            </label>

            <input
              type="text"
              value={form.isbn}
              onChange={(e) =>
                onChange("isbn", e.target.value)
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Slug Notice */}

          <div className="flex items-center rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-500">

            Slug will be generated automatically from the title.

          </div>

          {/* Description */}

          <div className="md:col-span-2">

            <label className="mb-2 block font-medium">
              Description
            </label>

            <textarea
              rows={6}
              value={form.description}
              onChange={(e) =>
                onChange(
                  "description",
                  e.target.value
                )
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
            />

          </div>

        </div>

      </div>
            {/* ==========================================
          UPLOADS
      =========================================== */}

      <div className="rounded-2xl border bg-white p-8 shadow-sm">

        <h2 className="mb-8 text-2xl font-bold">
          Book Assets
        </h2>

        <div className="grid gap-8 lg:grid-cols-2">

          {/* ================= Cover ================= */}

          <div>

            <label className="mb-3 block font-semibold">
              Book Cover
            </label>

            {form.coverImage ? (

              <div className="space-y-4">

                <Image
                  src={form.coverImage}
                  alt="Book Cover"
                  width={220}
                  height={300}
                  className="rounded-xl border object-cover shadow"
                />

                <div className="flex gap-3">

                  <label className="inline-flex cursor-pointer items-center rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">

                    <RefreshCw className="mr-2 h-4 w-4" />

                    Replace

                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          uploadFile(
                            e.target.files[0],
                            "coverImage"
                          );
                        }
                      }}
                    />

                  </label>

                  <button
                    type="button"
                    onClick={removeCover}
                    className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />

                    Remove
                  </button>

                </div>

              </div>

            ) : (

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-10 transition hover:border-blue-500 hover:bg-slate-50">

                <ImageIcon className="mb-3 h-10 w-10 text-blue-600" />

                <p className="font-semibold">
                  {uploadingCover
                    ? "Uploading..."
                    : "Upload Cover"}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  JPG • PNG • WEBP
                </p>

                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      uploadFile(
                        e.target.files[0],
                        "coverImage"
                      );
                    }
                  }}
                />

              </label>

            )}

          </div>

          {/* ================= PDF ================= */}

          <div>

            <label className="mb-3 block font-semibold">
              Sample PDF
            </label>

            {form.samplePdf ? (

              <div className="rounded-2xl border p-6">

                <div className="flex items-center">

                  <FileText className="mr-4 h-10 w-10 text-red-600" />

                  <div>

                    <p className="font-semibold">
                      PDF Uploaded
                    </p>

                    <p className="text-sm text-slate-500">
                      Ready for preview.
                    </p>

                  </div>

                </div>

                <div className="mt-6 flex gap-3">

                  <a
                    href={form.samplePdf}
                    target="_blank"
                    className="rounded-xl bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                  >
                    View
                  </a>

                  <label className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">

                    Replace

                    <input
                      hidden
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          uploadFile(
                            e.target.files[0],
                            "samplePdf"
                          );
                        }
                      }}
                    />

                  </label>

                  <button
                    type="button"
                    onClick={removePdf}
                    className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>

                </div>

              </div>

            ) : (

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-10 transition hover:border-red-500 hover:bg-slate-50">

                <Upload className="mb-3 h-10 w-10 text-red-600" />

                <p className="font-semibold">
                  {uploadingPdf
                    ? "Uploading..."
                    : "Upload PDF"}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  PDF up to 50 MB
                </p>

                <input
                  hidden
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      uploadFile(
                        e.target.files[0],
                        "samplePdf"
                      );
                    }
                  }}
                />

              </label>

            )}

          </div>

        </div>

      </div>

      {/* ==========================================
          ACADEMIC INFORMATION
      =========================================== */}

      <div className="rounded-2xl border bg-white p-8 shadow-sm">

        <h2 className="mb-6 text-2xl font-bold">
          Academic Information
        </h2>

        <div className="grid gap-6 md:grid-cols-3">

          <div>

            <label className="mb-2 block font-medium">
              Class *
            </label>

            <select
              required
              value={form.classId}
              onChange={(e) =>
                onChange("classId", e.target.value)
              }
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="">
                Select Class
              </option>

              {classes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}

            </select>

          </div>

          <div>

            <label className="mb-2 block font-medium">
              Subject *
            </label>

            <select
              required
              value={form.subjectId}
              onChange={(e) =>
                onChange("subjectId", e.target.value)
              }
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="">
                Select Subject
              </option>

              {subjects.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}

            </select>

          </div>

          <div>

            <label className="mb-2 block font-medium">
              Series
            </label>

            <select
              value={form.seriesId}
              onChange={(e) =>
                onChange("seriesId", e.target.value)
              }
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="">
                Select Series
              </option>

              {series.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}

            </select>

          </div>

        </div>

      </div>
            {/* ==========================================
          SETTINGS
      =========================================== */}

      <div className="rounded-2xl border bg-white p-8 shadow-sm">

        <h2 className="mb-6 text-2xl font-bold">
          Settings
        </h2>

        <div className="space-y-5">

          <label className="flex items-center gap-4 rounded-xl border p-4">

            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) =>
                onChange(
                  "featured",
                  e.target.checked
                )
              }
            />

            <div>

              <p className="font-semibold">
                Featured Book
              </p>

              <p className="text-sm text-slate-500">
                Display this book in featured sections.
              </p>

            </div>

          </label>

          <label className="flex items-center gap-4 rounded-xl border p-4">

            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) =>
                onChange(
                  "published",
                  e.target.checked
                )
              }
            />

            <div>

              <p className="font-semibold">
                Published
              </p>

              <p className="text-sm text-slate-500">
                Make this book visible on the website.
              </p>

            </div>

          </label>

        </div>

      </div>

      {/* ==========================================
          SAVE BUTTON
      =========================================== */}

      <div className="flex justify-end">

        <button
          type="submit"
          disabled={
            loading ||
            uploadingCover ||
            uploadingPdf
          }
          className="inline-flex items-center rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              {title}
            </>
          )}
        </button>

      </div>

    </form>
  );
}