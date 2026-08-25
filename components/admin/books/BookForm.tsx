"use client";

import { useState } from "react";
import NextImage, {
  type ImageProps,
} from "next/image";
import {
  FileText,
  ImageIcon,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

import { uploadFileToR2 } from "@/lib/storage/client-upload";
import { validateDirectUpload } from "@/lib/storage/upload-policy";
import type {
  BookFormChangeHandler,
  SelectOption,
} from "@/types/admin-book";
import type { BookFormData } from "@/types/book-form";

interface BookFormProps {
  title: string;
  form: BookFormData;
  classes: SelectOption[];
  subjects: SelectOption[];
  series: SelectOption[];
  boards: SelectOption[];
  loading: boolean;
  onChange: BookFormChangeHandler;
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
}

const input =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400";

function Image(props: ImageProps) {
  const src =
    typeof props.src === "string" &&
    !props.src.startsWith("/") &&
    !/^https?:\/\//.test(props.src)
      ? "/images/book-placeholder.jpg"
      : props.src;

  return (
    <NextImage
      {...props}
      src={src}
    />
  );
}

export default function BookForm({
  title,
  form,
  classes,
  subjects,
  series,
  boards,
  loading,
  onChange,
  onSubmit,
}: BookFormProps) {
  const [uploading, setUploading] =
    useState<
      | "coverImage"
      | "publicPreviewPdf"
      | null
    >(null);

  const [progress, setProgress] =
    useState(0);

  const [
    uploadMessage,
    setUploadMessage,
  ] = useState("");

  const [
    uploadError,
    setUploadError,
  ] = useState("");

  async function uploadFile(
    file: File,
    field:
      | "coverImage"
      | "publicPreviewPdf",
  ) {
    const scope =
      field === "coverImage"
        ? ("book-cover" as const)
        : ("book-public-preview" as const);

    const validation =
      validateDirectUpload(
        file,
        scope,
      );

    setUploadMessage("");
    setUploadError("");

    if (!validation.ok) {
      setUploadError(
        validation.message,
      );
      return;
    }

    setUploading(field);
    setProgress(0);

    try {
      const stored =
        await uploadFileToR2({
          file,
          scope,
          onProgress:
            setProgress,
        });

      onChange(
        field,
        stored.objectKey,
      );

      setUploadMessage(
        "Upload complete.",
      );
    } catch {
      setUploadError(
        "The file could not be uploaded. Please try again.",
      );
    } finally {
      setUploading(null);
      setProgress(0);
    }
  }

  const slug = form.title
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9\s-]/g,
      "",
    )
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
    >
      {uploadMessage ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
        >
          {uploadMessage}
        </p>
      ) : null}

      {uploadError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {uploadError}
        </p>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[250px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Book Cover
          </p>

          <div className="mt-4">
            {form.coverImage ? (
              <div>
                <Image
                  src={form.coverImage}
                  alt="Book cover"
                  width={220}
                  height={300}
                  className="mx-auto max-h-72 w-auto rounded-xl border border-slate-200 object-cover"
                />

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <UploadLabel
                    label={
                      uploading ===
                      "coverImage"
                        ? `Uploading ${progress}%`
                        : "Replace"
                    }
                    accept="image/png,image/jpeg,image/webp"
                    disabled={
                      uploading !== null
                    }
                    onFile={(file) =>
                      uploadFile(
                        file,
                        "coverImage",
                      )
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        "coverImage",
                        "",
                      )
                    }
                    className="inline-flex items-center rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <UploadBox
                label={
                  uploading ===
                  "coverImage"
                    ? `Uploading ${progress}%`
                    : "Upload Cover"
                }
                hint="JPG, PNG or WEBP"
                accept="image/png,image/jpeg,image/webp"
                disabled={
                  uploading !== null
                }
                onFile={(file) =>
                  uploadFile(
                    file,
                    "coverImage",
                  )
                }
                icon={
                  <ImageIcon className="h-8 w-8 text-blue-600" />
                }
              />
            )}
          </div>
        </div>

        <div className="space-y-5">
          <Card
            title="Book Details"
            description="Only the information needed to identify and classify the book."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Title"
                required
              >
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    onChange(
                      "title",
                      event.target.value,
                    )
                  }
                  className={input}
                />
              </Field>

              <Field label="Author">
                <input
                  value={form.author}
                  onChange={(event) =>
                    onChange(
                      "author",
                      event.target.value,
                    )
                  }
                  className={input}
                />
              </Field>

              <Field label="ISBN">
                <input
                  value={form.isbn}
                  onChange={(event) =>
                    onChange(
                      "isbn",
                      event.target.value,
                    )
                  }
                  className={input}
                />
              </Field>

              <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Web slug
                </p>
                <p className="mt-1 break-all text-xs font-medium text-slate-600">
                  {slug ||
                    "Generated from title"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField
                label="Class"
                required
                value={form.classId}
                options={classes}
                placeholder="Select Class"
                onChange={(value) =>
                  onChange(
                    "classId",
                    value,
                  )
                }
              />

              <SelectField
                label="Subject"
                required
                value={form.subjectId}
                options={subjects}
                placeholder="Select Subject"
                onChange={(value) =>
                  onChange(
                    "subjectId",
                    value,
                  )
                }
              />

              <SelectField
                label="Series"
                value={form.seriesId}
                options={series}
                placeholder="Select Series"
                onChange={(value) =>
                  onChange(
                    "seriesId",
                    value,
                  )
                }
              />

              <SelectField
                label="Board"
                value={form.boardId}
                options={boards}
                placeholder={
                  form.board &&
                  !form.boardId
                    ? `Legacy: ${form.board}`
                    : "Select Board"
                }
                onChange={(value) => {
                  onChange(
                    "boardId",
                    value,
                  );

                  const selected =
                    boards.find(
                      (option) =>
                        option.id ===
                        value,
                    );

                  if (selected) {
                    onChange(
                      "board",
                      selected.name,
                    );
                  }
                }}
              />
            </div>
          </Card>

          <Card
            title="Public Preview"
            description="Upload only the selected sample pages shown on the public website."
          >
            <div className="flex flex-col gap-4 rounded-2xl bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">
                  <FileText className="h-5 w-5" />
                </span>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Sample Preview PDF
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Limited pages for visitors.
                    This is not the digital book
                    used by teachers or students.
                  </p>

                  {form.publicPreviewPdf ? (
                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                      Preview PDF available
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <UploadLabel
                  label={
                    uploading ===
                    "publicPreviewPdf"
                      ? `Uploading ${progress}%`
                      : form.publicPreviewPdf
                        ? "Replace PDF"
                        : "Upload PDF"
                  }
                  accept="application/pdf"
                  disabled={
                    uploading !== null
                  }
                  onFile={(file) =>
                    uploadFile(
                      file,
                      "publicPreviewPdf",
                    )
                  }
                />

                {form.publicPreviewPdf ? (
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        "publicPreviewPdf",
                        "",
                      )
                    }
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card
            title="Publishing"
            description="Optional commercial and public catalogue information."
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Price">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    onChange(
                      "price",
                      event.target.value
                        ? Number(
                            event.target
                              .value,
                          )
                        : "",
                    )
                  }
                  className={input}
                />
              </Field>

              <Field label="Pages">
                <input
                  type="number"
                  min="1"
                  value={form.pages}
                  onChange={(event) =>
                    onChange(
                      "pages",
                      event.target.value
                        ? Number(
                            event.target
                              .value,
                          )
                        : "",
                    )
                  }
                  className={input}
                />
              </Field>

              <Field label="Publication Year">
                <input
                  value={
                    form.publicationYear
                  }
                  onChange={(event) =>
                    onChange(
                      "publicationYear",
                      event.target.value,
                    )
                  }
                  className={input}
                />
              </Field>

              <Field label="Weight">
                <input
                  value={form.weight}
                  onChange={(event) =>
                    onChange(
                      "weight",
                      event.target.value,
                    )
                  }
                  className={input}
                />
              </Field>
            </div>

            <Field
              label="About the book"
              className="mt-4"
            >
              <textarea
                rows={3}
                value={form.aboutBook}
                onChange={(event) =>
                  onChange(
                    "aboutBook",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400"
              />
            </Field>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Check
                label="Featured Book"
                description="Show in featured sections."
                checked={form.featured}
                onChange={(value) =>
                  onChange(
                    "featured",
                    value,
                  )
                }
              />

              <Check
                label="Published"
                description="Platform release state used by school, teacher, and student access."
                checked={form.published}
                onChange={(value) =>
                  onChange(
                    "published",
                    value,
                  )
                }
              />

              <Check
                label="Public Website Catalogue"
                description="Show this book on the Bluegate website only. This does not affect school, teacher, or student access."
                checked={form.publicCatalogueVisible}
                onChange={(value) =>
                  onChange(
                    "publicCatalogueVisible",
                    value,
                  )
                }
              />
            </div>

            <Field
              label="Featured display order"
              className="mt-4 max-w-xs"
            >
              <input
                type="number"
                min={0}
                step={1}
                value={form.featuredOrder}
                onChange={(event) =>
                  onChange(
                    "featuredOrder",
                    event.target.value,
                  )
                }
                className={input}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Lower numbers appear first in featured sections.
              </span>
            </Field>
          </Card>
        </div>
      </section>

      <div className="sticky bottom-0 z-20 flex justify-end border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={
            loading ||
            uploading !== null
          }
          className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {title}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-slate-950">
          {title}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`block space-y-1.5 text-xs font-semibold text-slate-700 ${className}`}
    >
      <span>
        {label}
        {required ? (
          <span className="text-red-500">
            {" "}
            *
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function SelectField({
  label,
  required,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <Field
      label={label}
      required={required}
    >
      <select
        required={required}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className={input}
      >
        <option value="">
          {placeholder}
        </option>

        {options.map((option) => (
          <option
            key={option.id}
            value={option.id}
          >
            {option.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function UploadBox({
  label,
  hint,
  accept,
  disabled,
  onFile,
  icon,
}: {
  label: string;
  hint: string;
  accept: string;
  disabled: boolean;
  onFile: (file: File) => void;
  icon: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-7 text-center transition hover:border-blue-400 hover:bg-slate-50">
      {icon}

      <p className="mt-3 text-sm font-semibold">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {hint}
      </p>

      <input
        hidden
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file =
            event.target.files?.[0];

          if (file) {
            onFile(file);
          }

          event.currentTarget.value =
            "";
        }}
      />
    </label>
  );
}

function UploadLabel({
  label,
  accept,
  disabled,
  onFile,
}: {
  label: string;
  accept: string;
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
      <Upload className="mr-1.5 h-4 w-4" />
      {label}

      <input
        hidden
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file =
            event.target.files?.[0];

          if (file) {
            onFile(file);
          }

          event.currentTarget.value =
            "";
        }}
      />
    </label>
  );
}

function Check({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (
    value: boolean,
  ) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
      />

      <span>
        <strong className="block text-sm text-slate-800">
          {label}
        </strong>

        <span className="text-xs text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}
