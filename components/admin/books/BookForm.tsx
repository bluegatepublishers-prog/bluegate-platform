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
import type { BookFormData } from "@/types/book-form";
import type {
  BookFormChangeHandler,
  SelectOption,
} from "@/types/admin-book";

interface BookFormProps {
  title: string;

  form: BookFormData;

  classes: SelectOption[];
  subjects: SelectOption[];
  series: SelectOption[];

  loading: boolean;

  onChange: BookFormChangeHandler;

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
  const [uploadingGallery, setUploadingGallery] = useState(false);

  function removeCover() {
    onChange("coverImage", "");
  }

  function removePdf() {
    onChange("samplePdf", "");
  }

  async function uploadFile(
    file: File,
    field: "coverImage" | "samplePdf" | "galleryImages"
  ) {
    const formData = new FormData();

    formData.append("file", file);

    if (field === "coverImage") {
      setUploadingCover(true);
    } else if (field === "samplePdf") {
      setUploadingPdf(true);
    } else {
      setUploadingGallery(true);
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

      if (field === "galleryImages") onChange(field, [...form.galleryImages, data.url]);
      else onChange(field, data.url);
    } catch (error) {
      console.error(error);
      alert("Upload failed.");
    } finally {
      if (field === "coverImage") {
        setUploadingCover(false);
      } else if (field === "samplePdf") {
        setUploadingPdf(false);
      } else {
        setUploadingGallery(false);
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
            <label className="mb-2 block font-medium">Author</label>
            <input type="text" value={form.author} onChange={(e) => onChange("author", e.target.value)} className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500" />
          </div>

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

      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Gallery</h2><p className="mt-1 text-sm text-slate-500">Optional additional JPG, PNG, or WEBP images.</p></div><label className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">{uploadingGallery ? "Uploading…" : "Add image"}<input hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingGallery} onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0], "galleryImages"); e.currentTarget.value = ""; }}/></label></div>
        {form.galleryImages.length ? <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{form.galleryImages.map((image, index) => <div key={`${image}-${index}`} className="relative overflow-hidden rounded-xl border"><Image src={image} alt={`Gallery image ${index + 1}`} width={180} height={140} className="h-32 w-full object-cover"/><button type="button" aria-label={`Remove gallery image ${index + 1}`} onClick={() => onChange("galleryImages", form.galleryImages.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-red-600 shadow"><Trash2 className="h-4 w-4"/></button></div>)}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No gallery images uploaded.</p>}
      </div>
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-2xl font-bold">Publishing Details</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {([
            ["edition", "Edition"], ["publisher", "Publisher"], ["publicationYear", "Publication year"],
            ["language", "Language"], ["board", "Board"], ["binding", "Binding"],
            ["weight", "Weight"], ["dimensions", "Dimensions"],
          ] as const).map(([field, label]) => (
            <label key={field} className="space-y-2"><span className="block font-medium">{label}</span><input value={form[field]} onChange={(e) => onChange(field, e.target.value)} className="w-full rounded-xl border px-4 py-3" /></label>
          ))}
          <label className="space-y-2"><span className="block font-medium">Pages</span><input type="number" min="1" value={form.pages} onChange={(e) => onChange("pages", e.target.value ? Number(e.target.value) : "")} className="w-full rounded-xl border px-4 py-3" /></label>
          <label className="space-y-2"><span className="block font-medium">Price</span><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => onChange("price", e.target.value ? Number(e.target.value) : "")} className="w-full rounded-xl border px-4 py-3" /></label>
        </div>
        <label className="mt-6 block space-y-2"><span className="block font-medium">About the book</span><textarea rows={5} value={form.aboutBook} onChange={(e) => onChange("aboutBook", e.target.value)} className="w-full rounded-xl border px-4 py-3" /></label>
      </div>

      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-2xl font-bold">SEO &amp; Discovery</h2>
        <div className="space-y-5">
          <label className="block space-y-2"><span className="block font-medium">SEO title</span><input value={form.seoTitle} maxLength={70} onChange={(e) => onChange("seoTitle", e.target.value)} className="w-full rounded-xl border px-4 py-3" /></label>
          <label className="block space-y-2"><span className="block font-medium">SEO description</span><textarea rows={3} value={form.seoDescription} maxLength={180} onChange={(e) => onChange("seoDescription", e.target.value)} className="w-full rounded-xl border px-4 py-3" /></label>
          <label className="block space-y-2"><span className="block font-medium">Keywords</span><input value={form.keywords.join(", ")} onChange={(e) => onChange("keywords", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="mathematics, class 8, workbook" className="w-full rounded-xl border px-4 py-3" /></label>
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
            uploadingPdf ||
            uploadingGallery
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
