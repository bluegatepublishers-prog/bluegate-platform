"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  FileArchive,
  FileAudio,
  FileQuestion,
  FileText,
  Film,
  Globe2,
  ImageIcon,
} from "lucide-react";
import { ResourceAudience } from "@prisma/client";

import ResourceMoreMenu from "@/components/admin/resources/ResourceMoreMenu";
import {
  getResourceAudienceBadgeClass,
  getResourceAudienceLabel,
} from "@/lib/resource-audience-ui";
import { formatFileSizeBytes } from "@/lib/resource-helpers";
import type {
  AdminResourceLibraryItem,
  AdminResourcePagination,
} from "@/types/admin-resource-library";

export default function ResourceLibraryView({
  items,
  pagination,
  view,
  returnTo,
  previousHref,
  nextHref,
}: {
  items: AdminResourceLibraryItem[];
  pagination: AdminResourcePagination;
  view: "list" | "cards";
  returnTo: string;
  previousHref: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = items.length > 0 && items.every((item) => selectedSet.has(item.id));

  function toggleAll() {
    setSelected(allSelected ? [] : items.map((item) => item.id));
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function bulk(action: string, audience?: ResourceAudience) {
    if (!selected.length) return;
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/admin/resources/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, action, audience }),
      });
      const payload = await response.json().catch(() => ({ message: "" }));
      if (!response.ok) {
        setMessage(payload.message || "Bulk update failed.");
        return;
      }
      setMessage(payload.message || "Resources updated.");
      setSelected([]);
      router.refresh();
    });
  }

  if (!items.length) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <FileText className="mx-auto h-12 w-12 text-slate-300" aria-hidden />
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          No resources found
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Try changing the filters, or upload a reusable document or media resource.
        </p>
        <Link
          href="/admin/resources/new"
          className="mt-5 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
        >
          Upload Resource
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {selected.length ? (
        <div
          className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 shadow-lg"
          role="region"
          aria-label="Bulk resource actions"
        >
          <strong className="mr-2 text-sm text-blue-900">
            {selected.length} selected
          </strong>
          <BulkButton disabled={pending} onClick={() => bulk("publish")}>
            Publish
          </BulkButton>
          <BulkButton disabled={pending} onClick={() => bulk("unpublish")}>
            Unpublish
          </BulkButton>
          <BulkButton disabled={pending} onClick={() => bulk("archive")}>
            Archive
          </BulkButton>
          <BulkButton disabled={pending} onClick={() => bulk("restore")}>
            Restore
          </BulkButton>
          <select
            aria-label="Change default audience"
            defaultValue=""
            disabled={pending}
            onChange={(event) => {
              if (event.target.value) {
                bulk("audience", event.target.value as ResourceAudience);
                event.target.value = "";
              }
            }}
            className="min-h-9 rounded-lg border border-blue-200 bg-white px-2 text-sm"
          >
            <option value="">Change audience…</option>
            <option value={ResourceAudience.TEACHER_ONLY}>Teacher only</option>
            <option value={ResourceAudience.STUDENT}>Students</option>
            <option value={ResourceAudience.BOTH}>Teachers and students</option>
          </select>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-blue-800"
          >
            Clear
          </button>
          <span className="w-full text-xs text-blue-800" aria-live="polite">
            {message}
          </span>
        </div>
      ) : null}

      {view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              selected={selectedSet.has(resource.id)}
              onToggle={() => toggle(resource.id)}
              returnTo={returnTo}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="hidden overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full table-fixed">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all resources on this page"
                    />
                  </th>
                  <th className="w-14 py-3" aria-label="Preview" />
                  <th className="px-3 py-3">Resource</th>
                  <th className="w-28 px-3 py-3">Type</th>
                  <th className="w-40 px-3 py-3">Audience</th>
                  <th className="w-32 px-3 py-3">Usage</th>
                  <th className="w-28 px-3 py-3">File size</th>
                  <th className="w-28 px-3 py-3">Status</th>
                  <th className="w-32 px-3 py-3">Updated</th>
                  <th className="w-16 px-3 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((resource) => (
                  <tr key={resource.id} className="group hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(resource.id)}
                        onChange={() => toggle(resource.id)}
                        aria-label={`Select ${resource.title}`}
                      />
                    </td>
                    <td className="py-3">
                      <ResourceThumb resource={resource} />
                    </td>
                    <td className="min-w-0 px-3 py-3">
                      <Link
                        href={`/admin/resources/${resource.id}?returnTo=${encodeURIComponent(returnTo)}`}
                        className="block truncate font-semibold text-slate-900 hover:text-blue-700"
                      >
                        {resource.title}
                      </Link>
                      <p className="truncate text-xs text-slate-500">
                        {[resource.book?.title, resource.className, resource.subjectName]
                          .filter(Boolean)
                          .join(" · ") || "General resource"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-slate-700">
                      {resource.type.replaceAll("_", " ")}
                    </td>
                    <td className="px-3 py-3">
                      <AudienceBadge audience={resource.audience} />
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      <span className="font-semibold text-slate-800">
                        {resource.contextualUsageCount}
                      </span>{" "}
                      placement{resource.contextualUsageCount === 1 ? "" : "s"}
                      <span className="block text-xs text-slate-400">
                        {resource.schoolUsageCount} school
                        {resource.schoolUsageCount === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {resource.fileSizeBytes
                        ? formatFileSizeBytes(Number(resource.fileSizeBytes))
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge resource={resource} />
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {formatDate(resource.updatedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <ResourceMoreMenu
                        id={resource.id}
                        published={resource.published}
                        archived={resource.archived}
                        returnTo={returnTo}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                selected={selectedSet.has(resource.id)}
                onToggle={() => toggle(resource.id)}
                returnTo={returnTo}
                compact
              />
            ))}
          </div>
        </>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <p className="text-slate-600">
          Showing {(pagination.page - 1) * pagination.pageSize + 1}–
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
          {pagination.total}
        </p>
        <div className="flex items-center gap-2">
          {previousHref ? (
            <Link href={previousHref} className="rounded-lg border px-3 py-2 font-semibold">
              Previous
            </Link>
          ) : (
            <span className="rounded-lg border px-3 py-2 text-slate-300">Previous</span>
          )}
          <span className="px-2 text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          {nextHref ? (
            <Link href={nextHref} className="rounded-lg border px-3 py-2 font-semibold">
              Next
            </Link>
          ) : (
            <span className="rounded-lg border px-3 py-2 text-slate-300">Next</span>
          )}
        </div>
      </footer>
    </section>
  );
}

function ResourceCard({
  resource,
  selected,
  onToggle,
  returnTo,
  compact = false,
}: {
  resource: AdminResourceLibraryItem;
  selected: boolean;
  onToggle: () => void;
  returnTo: string;
  compact?: boolean;
}) {
  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${resource.title}`}
          className="mt-1"
        />
        <ResourceThumb resource={resource} large={!compact} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/resources/${resource.id}?returnTo=${encodeURIComponent(returnTo)}`}
            className="line-clamp-2 font-bold text-slate-900 hover:text-blue-700"
          >
            {resource.title}
          </Link>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {resource.type.replaceAll("_", " ")}
          </p>
        </div>
        <ResourceMoreMenu
          id={resource.id}
          published={resource.published}
          archived={resource.archived}
          returnTo={returnTo}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <AudienceBadge audience={resource.audience} />
        <StatusBadge resource={resource} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <p>
          <strong className="block text-sm text-slate-800">
            {resource.contextualUsageCount + resource.schoolUsageCount}
          </strong>
          Total uses
        </p>
        <p className="text-right">
          <strong className="block text-sm text-slate-800">
            {formatDate(resource.updatedAt)}
          </strong>
          Updated
        </p>
      </div>
    </article>
  );
}

function ResourceThumb({
  resource,
  large = false,
}: {
  resource: AdminResourceLibraryItem;
  large?: boolean;
}) {
  const size = large ? "h-16 w-20" : "h-11 w-11";
  if (resource.thumbnail && /^https?:\/\//.test(resource.thumbnail)) {
    return (
      <Image
        src={resource.thumbnail}
        alt=""
        width={large ? 80 : 44}
        height={large ? 64 : 44}
        className={`${size} shrink-0 rounded-lg border object-cover`}
      />
    );
  }
  const Icon =
    resource.type === "VIDEO"
      ? Film
      : resource.type === "AUDIO"
        ? FileAudio
        : resource.type === "ZIP"
          ? FileArchive
          : resource.type === "LINK"
            ? Globe2
            : resource.type === "INTERACTIVE"
              ? ImageIcon
              : resource.type === "QUESTION_BANK"
                ? FileQuestion
                : FileText;
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700`}>
      <Icon className={large ? "h-7 w-7" : "h-5 w-5"} aria-hidden />
    </span>
  );
}

function AudienceBadge({ audience }: { audience: ResourceAudience }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getResourceAudienceBadgeClass(audience)}`}
    >
      {getResourceAudienceLabel(audience)}
    </span>
  );
}

function StatusBadge({ resource }: { resource: AdminResourceLibraryItem }) {
  const label = resource.archived
    ? "Archived"
    : resource.published
      ? "Published"
      : "Draft";
  const style = resource.archived
    ? "bg-slate-100 text-slate-600"
    : resource.published
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}

function BulkButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-900 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
