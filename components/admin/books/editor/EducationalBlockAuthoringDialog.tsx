"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Video,
  X,
} from "lucide-react";

import {
  EDUCATIONAL_OBJECT_REGISTRY,
  getEducationalObjectDefinition,
} from "@/lib/educational-object-registry";

type EducationalObjectType =
  (typeof EDUCATIONAL_OBJECT_REGISTRY)[number][0];

export type EducationalBlockAuthoringValue = {
  objectType: EducationalObjectType;
  body: string;
};

type Props = {
  open: boolean;
  initialType?: EducationalObjectType;
  initialBody?: string;
  saving?: boolean;

  onClose: () => void;

  onSave: (
    value: EducationalBlockAuthoringValue,
  ) => void | Promise<void>;

  onInsertImage?: () => void;
  onInsertVideo?: () => void;
};

type DialogBodyProps = Omit<Props, "open">;

function firstEducationalType(): EducationalObjectType {
  const first = EDUCATIONAL_OBJECT_REGISTRY[0];

  if (!first) {
    throw new Error(
      "No educational object types are registered.",
    );
  }

  return first[0];
}

export default function EducationalBlockAuthoringDialog({
  open,
  ...props
}: Props) {
  if (!open) {
    return null;
  }

  /*
   * Rendering a separate child only while open means its local authoring
   * state is naturally reset whenever the dialog is closed and reopened.
   * No state synchronization effect is required.
   */
  return (
    <EducationalBlockAuthoringDialogBody
      {...props}
    />
  );
}

function EducationalBlockAuthoringDialogBody({
  initialType,
  initialBody = "",
  saving = false,
  onClose,
  onSave,
  onInsertImage,
  onInsertVideo,
}: DialogBodyProps) {
  const [objectType, setObjectType] =
    useState<EducationalObjectType>(
      () =>
        initialType ??
        firstEducationalType(),
    );

  const [body, setBody] =
    useState(() => initialBody);

  const [error, setError] =
    useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const definition = useMemo(
    () =>
      getEducationalObjectDefinition(
        objectType,
      ),
    [objectType],
  );

  /*
   * This effect only synchronizes with browser APIs:
   * focus and Escape-key subscription.
   */
  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onClose();
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.clearTimeout(timer);

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  async function handleSave() {
    const cleanBody = body.trim();

    if (!cleanBody) {
      setError(
        "Please type or paste the content before saving.",
      );

      textareaRef.current?.focus();
      return;
    }

    setError("");

    await onSave({
      objectType,
      body: cleanBody,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="educational-block-dialog-title"
      data-v2-educational-authoring-dialog
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
              Educational Block
            </p>

            <h2
              id="educational-block-dialog-title"
              className="mt-1 text-xl font-bold text-slate-950"
            >
              Add Educational Content
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose the block, type or
              paste the matter, then save
              it as a compact book-page
              button.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close educational block editor"
            onClick={onClose}
            disabled={saving}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="space-y-5">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Block Type
              </span>

              <select
                aria-label="Educational block type"
                value={objectType}
                disabled={saving}
                onChange={(event) => {
                  setObjectType(
                    event.target
                      .value as EducationalObjectType,
                  );
                }}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
              >
                {EDUCATIONAL_OBJECT_REGISTRY.map(
                  ([type]) => {
                    const option =
                      getEducationalObjectDefinition(
                        type,
                      );

                    return (
                      <option
                        key={type}
                        value={type}
                      >
                        {option.label}
                      </option>
                    );
                  },
                )}
              </select>
            </label>

            <div
              className="rounded-xl border px-4 py-3"
              style={{
                borderColor:
                  definition.theme.border,
                backgroundColor:
                  definition.theme.tint,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-white text-lg"
                  style={{
                    color:
                      definition.theme
                        .accent,
                    borderColor:
                      definition.theme
                        .border,
                  }}
                >
                  {definition.icon}
                </span>

                <div className="min-w-0">
                  <p
                    className="font-bold"
                    style={{
                      color:
                        definition.theme
                          .accent,
                    }}
                  >
                    {definition.label}
                  </p>

                  <p className="text-xs text-slate-600">
                    {
                      definition.description
                    }
                  </p>
                </div>
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Content
              </span>

              <span className="ml-2 text-xs font-normal text-slate-500">
                Type or paste your matter
              </span>

              <textarea
                ref={textareaRef}
                aria-label="Educational block content"
                value={body}
                disabled={saving}
                onChange={(event) => {
                  setBody(
                    event.target.value,
                  );

                  if (error) {
                    setError("");
                  }
                }}
                placeholder={`Write the ${definition.label} content here...`}
                rows={10}
                className="mt-2 min-h-56 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-bold text-slate-700">
                Add Content
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    saving ||
                    !onInsertImage
                  }
                  onClick={onInsertImage}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ImageIcon className="h-4 w-4" />
                  Insert Image
                </button>

                <button
                  type="button"
                  disabled={
                    saving ||
                    !onInsertVideo
                  }
                  onClick={onInsertVideo}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Video className="h-4 w-4" />
                  Insert Video
                </button>
              </div>

              {!onInsertImage &&
              !onInsertVideo ? (
                <p className="mt-2 text-xs text-slate-500">
                  Image and video insertion
                  will use the existing
                  Content Studio resource
                  workflow when this dialog
                  is connected to the V2
                  workspace.
                </p>
              ) : null}
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
              >
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs text-slate-500">
            After Save, only the compact{" "}
            <strong>
              {definition.label}
            </strong>{" "}
            button should remain on the
            book page.
          </p>

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() =>
                void handleSave()
              }
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving
                ? "Saving..."
                : "Save as Button"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}