"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenText,
  CheckCheck,
  CircleDashed,
  FolderKanban,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Undo2,
} from "lucide-react";

import { updateSchoolFeatureEntitlementsAction } from "@/app/admin/schools/actions";

type FeatureCard = {
  key: string;
  label: string;
  platformAvailable: boolean;
  enabled: boolean;
  lastModified: string | null;
  modifiedBy: string | null;
};

type CategoryCard = {
  category: string;
  features: FeatureCard[];
};

type AuditItem = {
  id: string;
  featureLabel: string;
  action: "ENABLE" | "DISABLE";
  at: string;
  by: string | null;
};

type SaveState = {
  ok: boolean;
  message: string;
  savedAt: string | null;
};

const INITIAL_STATE: SaveState = {
  ok: false,
  message: "",
  savedAt: null,
};

const CATEGORY_ICONS: Record<string, typeof FolderKanban> = {
  Communication: ShieldCheck,
  Academic: BookOpenText,
  "Learning Resources": FolderKanban,
  AI: Sparkles,
  Administration: CircleDashed,
};

export default function SchoolFeatureManager({
  schoolId,
  plan,
  categories,
  audits,
  canEdit,
}: {
  schoolId: string;
  plan: "FREE" | "PAID";
  categories: CategoryCard[];
  audits: AuditItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const [draft, setDraft] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      categories.flatMap((category) =>
        category.features.map((feature) => [
          feature.key,
          feature.enabled,
        ]),
      ),
    ),
  );

  const [state, formAction, pending] = useActionState(
    updateSchoolFeatureEntitlementsAction.bind(null, schoolId),
    INITIAL_STATE,
  );

  useEffect(() => {
    if (state.ok && state.savedAt) {
      const timer = window.setTimeout(
        () => router.refresh(),
        350,
      );

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [router, state.ok, state.savedAt]);

  const visibleCategories = useMemo(() => {
    const term = search.trim().toLowerCase();

    return categories
      .map((category) => ({
        ...category,
        features: category.features.filter((feature) => {
          if (!term) return true;

          return `${category.category} ${feature.label} ${feature.key}`
            .toLowerCase()
            .includes(term);
        }),
      }))
      .filter(
        (category) =>
          category.features.length > 0 || !term,
      );
  }, [categories, search]);

  const totalFeatures = categories.reduce(
    (sum, category) => sum + category.features.length,
    0,
  );

  const enabledFeatures = categories.reduce(
    (sum, category) =>
      sum +
      category.features.filter((feature) => draft[feature.key]).length,
    0,
  );

  const lockedFeatures = categories.reduce(
    (sum, category) =>
      sum +
      category.features.filter(
        (feature) => !canEdit || !feature.platformAvailable,
      ).length,
    0,
  );

  function setAll(
    category: CategoryCard,
    enabled: boolean,
  ) {
    if (!canEdit) return;

    setDraft((current) => {
      const next = { ...current };

      for (const feature of category.features) {
        if (feature.platformAvailable) {
          next[feature.key] = enabled;
        }
      }

      return next;
    });
  }

  function enableAllAvailable() {
    if (!canEdit) return;

    setDraft((current) => {
      const next = { ...current };

      for (const category of categories) {
        for (const feature of category.features) {
          if (feature.platformAvailable) {
            next[feature.key] = true;
          }
        }
      }

      return next;
    });
  }

  function resetDraft() {
    setDraft(
      Object.fromEntries(
        categories.flatMap((category) =>
          category.features.map((feature) => [
            feature.key,
            feature.enabled,
          ]),
        ),
      ),
    );
  }

  const activePayload = JSON.stringify(draft);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xs font-bold text-slate-950">
              Platform Features
            </h2>

            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                plan === "PAID"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {plan} PLAN
            </span>
          </div>

          <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">
            Publisher controls which platform modules this school can use.
            School operational permissions remain under the school administrator.
          </p>
        </div>

        <div className="flex gap-1.5">
          <Stat label="Total" value={totalFeatures} />
          <Stat label="Enabled" value={enabledFeatures} />
          <Stat label="Locked" value={lockedFeatures} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search features"
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[11px] outline-none focus:border-blue-400"
          />
        </label>

        <button
          type="button"
          onClick={enableAllAvailable}
          disabled={!canEdit}
          className="h-8 rounded-lg border border-slate-200 px-3 text-[10px] font-semibold text-slate-700 disabled:opacity-40"
        >
          Enable Available
        </button>

        <button
          type="button"
          onClick={resetDraft}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[10px] font-semibold text-slate-700"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </button>
      </div>

      <form action={formAction} className="mt-4 space-y-3">
        <input
          type="hidden"
          name="featureConfigJson"
          value={activePayload}
        />

        {visibleCategories.length ? (
          visibleCategories.map((category) => {
            const Icon =
              CATEGORY_ICONS[category.category] ?? ShieldCheck;

            const enabledCount = category.features.filter(
              (feature) => draft[feature.key],
            ).length;

            return (
              <section
                key={category.category}
                className="overflow-hidden rounded-xl border border-slate-200"
              >
                <header className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-blue-700" />
                    <p className="text-[11px] font-bold text-slate-800">
                      {category.category}
                    </p>
                    <span className="text-[9px] text-slate-400">
                      {enabledCount}/{category.features.length} on
                    </span>
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setAll(category, true)}
                      disabled={!canEdit}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-semibold text-slate-600 disabled:opacity-40"
                    >
                      All on
                    </button>

                    <button
                      type="button"
                      onClick={() => setAll(category, false)}
                      disabled={!canEdit}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-semibold text-slate-600 disabled:opacity-40"
                    >
                      All off
                    </button>
                  </div>
                </header>

                <div className="grid gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-3">
                  {category.features.map((feature) => {
                    const enabled = Boolean(draft[feature.key]);
                    const locked =
                      !canEdit || !feature.platformAvailable;

                    return (
                      <article
                        key={feature.key}
                        className="flex min-w-0 items-center justify-between gap-3 bg-white px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-slate-800">
                            {feature.label}
                          </p>
                          <p className="mt-0.5 truncate text-[9px] text-slate-400">
                            {locked
                              ? !canEdit
                                ? "Set access plan first"
                                : "Unavailable at platform level"
                              : enabled
                                ? "Enabled for school"
                                : "Disabled for school"}
                          </p>
                        </div>

                        <label
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                            locked
                              ? "cursor-not-allowed bg-slate-200"
                              : enabled
                                ? "cursor-pointer bg-blue-600"
                                : "cursor-pointer bg-slate-300"
                          }`}
                          title={
                            feature.lastModified
                              ? `Last changed ${new Date(
                                  feature.lastModified,
                                ).toLocaleString("en-IN")}${
                                  feature.modifiedBy
                                    ? ` by ${feature.modifiedBy}`
                                    : ""
                                }`
                              : undefined
                          }
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            disabled={locked}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                [feature.key]: event.target.checked,
                              }))
                            }
                            className="sr-only"
                          />

                          <span
                            className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${
                              enabled
                                ? "translate-x-4"
                                : "translate-x-0.5"
                            }`}
                          />
                        </label>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-[11px] text-slate-400">
            No features match your search.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-[10px] text-slate-500">
            {canEdit
              ? `${enabledFeatures} of ${totalFeatures} features selected for this ${plan.toLowerCase()} school.`
              : "Create or set the access plan before editing features."}
          </p>

          <button
            type="submit"
            disabled={pending || !canEdit}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            {pending ? "Saving..." : "Save Features"}
          </button>
        </div>
      </form>

      {state.message ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 top-20 z-50 max-w-sm rounded-xl border px-4 py-3 text-xs shadow-xl ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      {audits.length ? (
        <details className="mt-3 border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-[10px] font-semibold text-slate-600">
            Recent feature activity ({audits.length})
          </summary>

          <div className="mt-2 grid gap-1.5 md:grid-cols-2">
            {audits.slice(0, 8).map((audit) => (
              <div
                key={audit.id}
                className="rounded-lg bg-slate-50 px-3 py-2 text-[9px] text-slate-500"
              >
                <strong className="text-slate-700">
                  {audit.featureLabel}
                </strong>{" "}
                {audit.action === "ENABLE" ? "enabled" : "disabled"}
                {" · "}
                {audit.by ?? "System"}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-14 rounded-lg bg-slate-50 px-2.5 py-1.5 text-center">
      <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}
