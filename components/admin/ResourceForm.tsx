"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import Image from "next/image";
import { ResourceAudience, type ResourceType } from "@prisma/client";
import { uploadPresigned } from "@vercel/blob/client";
import { publisherUploadPath, validateDirectUpload } from "@/lib/storage/upload-policy";
import { usePublisherAdminId } from "@/components/admin/PublisherAdminContext";
import { RESOURCE_AUDIENCE_OPTIONS } from "@/lib/resource-audience-ui";
import { formatFileSizeBytes, getResourceFileName } from "@/lib/resource-helpers";
import type { ResourceFormOptions } from "@/lib/resource-form-data";

const ACCEPTED_FILES = ".pdf,.ppt,.pptx,.doc,.docx,.zip,.mp4,.webm,.mov";

interface ResourceFormData {
  id?: string;
  title: string;
  description: string;
  subject: string;
  classLevel: string;
  classId: string | null;
  subjectId: string | null;
  seriesId: string | null;
  bookId: string | null;
  type: ResourceType;
  audience: ResourceAudience;
  fileUrl: string;
  thumbnail: string | null;
  featured: boolean;
  published: boolean;
  originalFileName: string | null;
  mimeType: string | null;
  fileSizeBytes: string | null;
}

export type ResourceFormInitialValue = ResourceFormData;

export default function ResourceForm({
  resource,
  options,
}: {
  resource?: ResourceFormInitialValue;
  options: ResourceFormOptions;
}) {
  const publisherId = usePublisherAdminId();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const [form, setForm] = useState<ResourceFormData>({
    id: resource?.id,
    title: resource?.title ?? "",
    description: resource?.description ?? "",
    subject: resource?.subject ?? "",
    classLevel: resource?.classLevel ?? "",
    classId: resource?.classId ?? null,
    subjectId: resource?.subjectId ?? null,
    seriesId: resource?.seriesId ?? null,
    bookId: resource?.bookId ?? null,
    type: resource?.type ?? "PDF",
    audience: resource?.audience ?? ResourceAudience.TEACHER_ONLY,
    fileUrl: resource?.fileUrl ?? "",
    thumbnail: resource?.thumbnail ?? null,
    featured: resource?.featured ?? false,
    published: resource?.published ?? true,
    originalFileName: resource?.originalFileName ?? null,
    mimeType: resource?.mimeType ?? null,
    fileSizeBytes: resource?.fileSizeBytes ?? null,
  });

  const booksById = useMemo(
    () => new Map(options.books.map((book) => [book.id, book])),
    [options.books],
  );

  const selectedBook = form.bookId ? booksById.get(form.bookId) : null;

  const selectedClass =
    options.classes.find((item) => item.id === form.classId) ?? null;
  const selectedSubject =
    options.subjects.find((item) => item.id === form.subjectId) ?? null;

  const currentFileName = form.fileUrl
    ? getResourceFileName({ originalFileName: form.originalFileName, fileUrl: form.fileUrl })
    : "";

  const currentFileSize = form.fileSizeBytes
    ? formatFileSizeBytes(Number(form.fileSizeBytes))
    : "";

  async function upload(file: File, scope: "resource-file" | "resource-thumbnail") {
    setError("");
    setSuccessMessage("");
    setUploadMessage("");
    setProgress(0);

    const validation = validateDirectUpload(file, scope);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    try {
      const blob = await uploadPresigned(
        publisherUploadPath(publisherId, scope, file.name),
        file,
        {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({ scope, originalName: file.name }),
          multipart: file.size > 5 * 1024 * 1024,
          onUploadProgress: (event) =>
            setProgress(Math.max(1, Math.round(event.percentage))),
        },
      );

      if (scope === "resource-file") {
        setForm((value) => ({
          ...value,
          fileUrl: blob.url,
          type: inferType(file.name),
          originalFileName: file.name,
          mimeType: file.type.toLowerCase(),
          fileSizeBytes: String(file.size),
        }));
      } else {
        setForm((value) => ({ ...value, thumbnail: blob.url }));
      }

      setUploadMessage("Upload complete.");
      setProgress(100);
    } catch {
      setError("The file could not be uploaded. Please try again.");
      setProgress(0);
    }
  }

  function onBookChange(bookId: string) {
    if (!bookId) {
      setForm((value) => ({ ...value, bookId: null }));
      return;
    }

    const book = booksById.get(bookId);
    if (!book) return;

    setForm((value) => ({
      ...value,
      bookId,
      classId: book.classId,
      subjectId: book.subjectId,
      seriesId: book.seriesId,
      classLevel: book.className,
      subject: book.subjectName,
    }));
  }

  function onClassChange(classId: string) {
    const classRecord = options.classes.find((item) => item.id === classId) ?? null;
    setForm((value) => ({
      ...value,
      classId: classId || null,
      classLevel: classRecord?.name ?? value.classLevel,
    }));
  }

  function onSubjectChange(subjectId: string) {
    const subjectRecord =
      options.subjects.find((item) => item.id === subjectId) ?? null;
    setForm((value) => ({
      ...value,
      subjectId: subjectId || null,
      subject: subjectRecord?.name ?? value.subject,
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMessage("");

    const response = await fetch(
      resource ? `/api/admin/resources/${resource.id}` : "/api/admin/resources",
      {
        method: resource ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );

    setSaving(false);

    const payload = await response.json().catch(() => ({ message: "" }));
    if (!response.ok) {
      setError(payload.message || "Unable to save resource.");
      return;
    }

    setSuccessMessage(resource ? "Resource updated." : "Resource created.");
    router.push("/admin/resources");
    router.refresh();
  }

  const isUploading = progress > 0 && progress < 100;

  return (
    <form
      onSubmit={submit}
      className="space-y-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) upload(file, "resource-file");
        }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center ${
          dragging ? "border-blue-500 bg-blue-50" : "border-slate-300"
        }`}
      >
        <UploadCloud className="mx-auto h-10 w-10 text-blue-600" />
        <h2 className="mt-3 font-bold">Drop a resource file here</h2>
        <p className="mt-1 text-sm text-slate-500">
          PDF, PPTX, DOCX, ZIP or MP4 · maximum 100 MB
        </p>

        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_FILES}
          className="hidden"
          onChange={(event) =>
            event.target.files?.[0] && upload(event.target.files[0], "resource-file")
          }
        />

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white"
        >
          Choose file
        </button>

        {form.fileUrl ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-left text-sm text-slate-700">
            <p className="font-semibold">Current file: {currentFileName}</p>
            {currentFileSize ? <p>Size: {currentFileSize}</p> : null}
            {form.mimeType ? <p>Type: {form.mimeType}</p> : null}
          </div>
        ) : null}

        {isUploading ? (
          <div className="mx-auto mt-4 max-w-md">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-sm">{progress}%</p>
          </div>
        ) : null}

        {isUploading ? (
          <p className="mt-2 text-sm font-semibold text-blue-700">Uploading…</p>
        ) : null}

        {uploadMessage ? (
          <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">
            {uploadMessage}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Title"
          value={form.title}
          onChange={(title) => setForm({ ...form, title })}
          required
        />

        <label className="text-sm font-semibold text-slate-700">
          Resource type
          <select
            value={form.type}
            onChange={(event) =>
              setForm({ ...form, type: event.target.value as ResourceType })
            }
            className="mt-2 w-full rounded-xl border px-4 py-3"
          >
            {["PDF", "PPT", "DOC", "ZIP", "VIDEO"].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Class (optional)
          <select
            value={form.classId ?? ""}
            onChange={(event) => onClassChange(event.target.value)}
            className="mt-2 w-full rounded-xl border px-4 py-3"
          >
            <option value="">General resource</option>
            {options.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Subject (optional)
          <select
            value={form.subjectId ?? ""}
            onChange={(event) => onSubjectChange(event.target.value)}
            className="mt-2 w-full rounded-xl border px-4 py-3"
          >
            <option value="">General resource</option>
            {options.subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Series (optional)
          <select
            value={form.seriesId ?? ""}
            onChange={(event) =>
              setForm({ ...form, seriesId: event.target.value || null })
            }
            className="mt-2 w-full rounded-xl border px-4 py-3"
          >
            <option value="">No series</option>
            {options.series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Book (optional)
          <select
            value={form.bookId ?? ""}
            onChange={(event) => onBookChange(event.target.value)}
            className="mt-2 w-full rounded-xl border px-4 py-3"
          >
            <option value="">No book</option>
            {options.books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title} · {book.className} · {book.subjectName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {options.series.length === 0 ? (
        <p className="text-sm text-slate-500">
          No publisher series found yet. You can still create a general resource.
        </p>
      ) : null}

      {options.books.length === 0 ? (
        <p className="text-sm text-slate-500">
          No publisher books found yet. You can still create a general resource.
        </p>
      ) : null}

      {selectedBook ? (
        <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
          Book selected. Class, subject, and series will follow the book settings.
        </p>
      ) : null}

      <fieldset className="rounded-2xl border border-slate-200 p-5">
        <legend className="px-2 font-bold">Audience</legend>
        <p className="mb-4 text-sm text-slate-600">
          Required. File type does not determine who may use this resource.
        </p>

        <div className="space-y-3">
          {RESOURCE_AUDIENCE_OPTIONS.map(({ value, label, description }) => (
            <label key={value} className="flex gap-3 rounded-xl border p-4">
              <input
                required
                type="radio"
                name="audience"
                value={value}
                checked={form.audience === value}
                onChange={() => setForm({ ...form, audience: value })}
              />
              <span>
                <strong>{label}</strong>
                <span className="mt-1 block text-sm font-normal text-slate-500">
                  {description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-semibold text-slate-700">
        Description
        <textarea
          rows={5}
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          className="mt-2 w-full rounded-xl border px-4 py-3"
          required
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Class label (legacy fallback)"
          value={form.classLevel}
          onChange={(classLevel) => setForm({ ...form, classLevel })}
        />
        <Field
          label="Subject label (legacy fallback)"
          value={form.subject}
          onChange={(subject) => setForm({ ...form, subject })}
        />
      </div>

      <label className="block text-sm font-semibold text-slate-700">
        Thumbnail (optional)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) =>
            event.target.files?.[0] && upload(event.target.files[0], "resource-thumbnail")
          }
          className="mt-2 block w-full rounded-xl border p-3"
        />
      </label>

      {form.thumbnail ? (
        <Image
          src={form.thumbnail}
          alt="Resource thumbnail preview"
          width={192}
          height={128}
          className="h-32 w-48 rounded-xl border object-cover"
        />
      ) : null}

      {selectedClass || selectedSubject ? (
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          {selectedClass ? <p>Class: {selectedClass.name}</p> : null}
          {selectedSubject ? <p>Subject: {selectedSubject.name}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-6">
        <Check
          label="Featured"
          checked={form.featured}
          onChange={(featured) => setForm({ ...form, featured })}
        />
        <Check
          label="Published"
          checked={form.published}
          onChange={(published) => setForm({ ...form, published })}
        />
      </div>

      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
      {successMessage ? (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <button
        disabled={saving || !form.fileUrl || isUploading}
        className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : resource ? "Update resource" : "Create resource"}
      </button>
    </form>
  );
}

function inferType(name: string): ResourceType {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "ppt" || ext === "pptx") return "PPT";
  if (ext === "doc" || ext === "docx") return "DOC";
  if (ext === "mp4" || ext === "webm" || ext === "mov") return "VIDEO";
  if (ext === "zip") return "ZIP";
  return "PDF";
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border px-4 py-3"
      />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
