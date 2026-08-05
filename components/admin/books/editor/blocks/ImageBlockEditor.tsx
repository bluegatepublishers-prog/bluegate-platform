"use client";

import Link from "next/link";
import type { KeyboardEvent } from "react";

import {
  sanitizeUrl,
  type ContentBlock,
} from "@/lib/content-document";

type ResourceChoice = {
  id: string;
  title: string;
  thumbnail: string | null;
  fileUrl: string | null;
};

type ImageBlock = Extract<
  ContentBlock,
  { type: "image" | "diagram" }
>;

type ImageBlockEditorProps = {
  bookId: string;
  block: ImageBlock;
  resources: ResourceChoice[];

  onChooseResource: (resourceId: string) => void;
  onClearImage: () => void;
  onUpdatePatch: (patch: Partial<ContentBlock>) => void;

  onKeyDown: (
    event: KeyboardEvent<HTMLElement>,
    currentValue: string,
  ) => void;
};

const field =
  "mt-2 w-full rounded-[1.25rem] border border-transparent bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-200";

export default function ImageBlockEditor({
  bookId,
  block,
  resources,
  onChooseResource,
  onClearImage,
  onUpdatePatch,
  onKeyDown,
}: ImageBlockEditorProps) {
  const safeImage = sanitizeUrl(block.url);

  return (
    <div className="space-y-4">
      {safeImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeImage}
          alt={block.alt || "Illustration"}
          className="max-h-[28rem] w-full rounded-3xl object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
          Add an image URL or choose a resource thumbnail
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Image URL
          <input
            data-block-id={block.id}
            value={block.url}
            onChange={(event) =>
              onUpdatePatch({
                url: event.target.value,
                resourceId: undefined,
              })
            }
            onKeyDown={(event) =>
              onKeyDown(event, block.url)
            }
            placeholder="https://..."
            className={field}
          />
        </label>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Resource
            <select
              value={block.resourceId ?? ""}
              onChange={(event) =>
                onChooseResource(event.target.value)
              }
              className={field}
            >
              <option value="">
                Use a resource thumbnail
              </option>

              {resources
                .filter(
                  (resource) =>
                    sanitizeUrl(
                      resource.thumbnail ?? "",
                    ) ||
                    sanitizeUrl(
                      resource.fileUrl ?? "",
                    ),
                )
                .map((resource) => (
                  <option
                    key={resource.id}
                    value={resource.id}
                  >
                    {resource.title}
                  </option>
                ))}
            </select>
          </label>

          <Link
            href={`/admin/resources/new?returnTo=${encodeURIComponent(
              `/admin/books/${bookId}/content?selected=${encodeURIComponent(
                block.id,
              )}`,
            )}`}
            className="inline-flex text-sm font-semibold text-blue-700"
          >
            Upload new resource
          </Link>
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Alt text
          <input
            value={block.alt}
            onChange={(event) =>
              onUpdatePatch({
                alt: event.target.value,
              })
            }
            placeholder="Describe the image"
            className={field}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Width
          <select
            value={block.width ?? "full"}
            onChange={(event) =>
              onUpdatePatch({
                width: event.target.value as
                  | "full"
                  | "wide"
                  | "medium",
              })
            }
            className={field}
          >
            <option value="full">full</option>
            <option value="wide">wide</option>
            <option value="medium">medium</option>
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Float
          <select
            value={block.float ?? "none"}
            onChange={(event) =>
              onUpdatePatch({
                float: event.target.value as
                  | "none"
                  | "left"
                  | "right",
              })
            }
            className={field}
          >
            <option value="none">none</option>
            <option value="left">left</option>
            <option value="right">right</option>
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
          Caption
          <input
            value={block.caption ?? ""}
            onChange={(event) =>
              onUpdatePatch({
                caption:
                  event.target.value || undefined,
              })
            }
            placeholder="Optional caption"
            className={field}
          />
        </label>

        <button
          type="button"
          onClick={onClearImage}
          className="self-end rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Clear image
        </button>
      </div>
    </div>
  );
}