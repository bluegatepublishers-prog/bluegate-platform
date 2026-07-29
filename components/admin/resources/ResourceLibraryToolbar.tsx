import Link from "next/link";
import {
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { ResourceType } from "@prisma/client";

import type { ResourceLibraryQuery } from "@/lib/admin-resource-library";
import {
  RESOURCE_AUDIENCE_OPTIONS,
} from "@/lib/resource-audience-ui";

const presets = [
  ["all", "All Resources"],
  ["documents", "Documents"],
  ["teacher", "Teacher Resources"],
  ["student", "Student Resources"],
  ["published", "Published"],
  ["draft", "Draft"],
  ["unattached", "Unattached"],
  ["recent", "Recently Updated"],
  ["archived", "Archived"],
] as const;

function paramsFor(
  query: ResourceLibraryQuery,
  overrides: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  if (query.query) params.set("query", query.query);
  if (query.type) params.set("type", query.type);
  if (query.audience) params.set("audience", query.audience);
  if (query.status) params.set("status", query.status);
  if (query.attachment) params.set("attachment", query.attachment);
  if (query.sort !== "updated_desc") params.set("sort", query.sort);
  if (query.preset !== "all") params.set("preset", query.preset);
  if (query.view !== "list") params.set("view", query.view);
  if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
  for (const [key, value] of Object.entries(overrides)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const text = params.toString();
  return text ? `/admin/resources?${text}` : "/admin/resources";
}

export default function ResourceLibraryToolbar({
  query,
}: {
  query: ResourceLibraryQuery;
}) {
  return (
    <section className="space-y-4" aria-label="Resource Library controls">
      <nav
        aria-label="Resource views"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {presets.map(([value, label]) => (
          <Link
            key={value}
            href={paramsFor(query, { preset: value, page: undefined })}
            aria-current={query.preset === value ? "page" : undefined}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
              query.preset === value
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <form
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="preset" value={query.preset} />
        <input type="hidden" name="view" value={query.view} />
        <div className="grid gap-3 lg:grid-cols-[minmax(18rem,1fr)_repeat(4,minmax(9rem,auto))_auto]">
          <label className="relative">
            <span className="sr-only">Search resources</span>
            <Search
              className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400"
              aria-hidden
            />
            <input
              name="query"
              defaultValue={query.query}
              placeholder="Search title, filename, subject, book…"
              className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <FilterSelect
            label="Resource type"
            name="type"
            defaultValue={query.type}
            options={Object.values(ResourceType).map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            }))}
          />
          <FilterSelect
            label="Audience"
            name="audience"
            defaultValue={query.audience}
            options={RESOURCE_AUDIENCE_OPTIONS.map(({ value, label }) => ({
              value,
              label,
            }))}
          />
          <FilterSelect
            label="Status"
            name="status"
            defaultValue={query.status}
            options={[
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <FilterSelect
            label="Attachment"
            name="attachment"
            defaultValue={query.attachment}
            options={[
              { value: "attached", label: "Attached" },
              { value: "unattached", label: "Unattached" },
            ]}
          />

          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Apply
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Sort"
              name="sort"
              defaultValue={query.sort}
              options={[
                { value: "updated_desc", label: "Recently updated" },
                { value: "updated_asc", label: "Oldest updated" },
                { value: "created_desc", label: "Recently created" },
                { value: "title_asc", label: "Title A–Z" },
                { value: "title_desc", label: "Title Z–A" },
              ]}
              alwaysValue
            />
            <Link
              href="/admin/resources"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Clear
            </Link>
            <Link
              href={paramsFor(query, { page: undefined })}
              aria-label="Refresh resources"
              className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <Link
              href={paramsFor(query, { view: "list", page: undefined })}
              aria-label="List view"
              aria-current={query.view === "list" ? "page" : undefined}
              className={`rounded-lg p-2 ${
                query.view === "list"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <List className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={paramsFor(query, { view: "cards", page: undefined })}
              aria-label="Card view"
              aria-current={query.view === "cards" ? "page" : undefined}
              className={`rounded-lg p-2 ${
                query.view === "cards"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </form>
    </section>
  );
}

function FilterSelect({
  label,
  name,
  defaultValue,
  options,
  alwaysValue = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
  alwaysValue?: boolean;
}) {
  return (
    <label className="sr-only">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="not-sr-only min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        aria-label={label}
      >
        {!alwaysValue ? <option value="">All {label.toLowerCase()}s</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
