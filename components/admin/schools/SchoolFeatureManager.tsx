"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useMemo, useState } from "react";
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
  categories,
  audits,
  canEdit,
}: {
  schoolId: string;
  categories: CategoryCard[];
  audits: AuditItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categories.flatMap((category) => category.features.map((feature) => [feature.key, feature.enabled]))),
  );
  const [state, formAction, pending] = useActionState(
    updateSchoolFeatureEntitlementsAction.bind(null, schoolId),
    INITIAL_STATE,
  );

  useEffect(() => {
    if (state.ok && state.savedAt) {
      const timer = window.setTimeout(() => router.refresh(), 350);
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
          return `${category.category} ${feature.label} ${feature.key}`.toLowerCase().includes(term);
        }),
      }))
      .filter((category) => category.features.length > 0 || !term);
  }, [categories, search]);

  const totalFeatures = categories.reduce((sum, category) => sum + category.features.length, 0);
  const enabledFeatures = categories.reduce((sum, category) => sum + category.features.filter((feature) => draft[feature.key]).length, 0);
  const lockedFeatures = categories.reduce((sum, category) => sum + category.features.filter((feature) => !canEdit || !feature.platformAvailable).length, 0);

  function setAll(category: CategoryCard, enabled: boolean) {
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

  function resetDraft() {
    setDraft(
      Object.fromEntries(categories.flatMap((category) => category.features.map((feature) => [feature.key, feature.enabled]))),
    );
  }

  const activePayload = JSON.stringify(draft);

  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            <CheckCheck className="h-3.5 w-3.5" />
            Platform Features
          </div>
          <h3 className="mt-3 text-2xl font-bold">Feature manager</h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Enable modules for this school. Publisher-disabled modules stay locked, but school-owned entitlements can still be adjusted and saved independently.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Total" value={totalFeatures} />
          <Stat label="Enabled" value={enabledFeatures} />
          <Stat label="Locked" value={lockedFeatures} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="min-w-72 flex-1">
          <span className="sr-only">Search features</span>
          <div className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search features or categories"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </label>
        <button type="button" onClick={resetDraft} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold">
          <Undo2 className="h-4 w-4" />
          Undo changes
        </button>
      </div>

      <form action={formAction} className="mt-6 space-y-6">
        <input type="hidden" name="featureConfigJson" value={activePayload} />

        {visibleCategories.length ? (
          visibleCategories.map((category) => {
            const Icon = CATEGORY_ICONS[category.category] ?? ShieldCheck;
            const enabledCount = category.features.filter((feature) => draft[feature.key]).length;
            const categoryLockedCount = category.features.filter((feature) => !feature.platformAvailable).length;

            return (
              <section key={category.category} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                      <Icon className="h-3.5 w-3.5" />
                      {category.category}
                    </div>
                    <h4 className="mt-3 text-xl font-bold text-slate-900">{category.category}</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {enabledCount} enabled · {categoryLockedCount} locked
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAll(category, true)}
                      disabled={!canEdit}
                      className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setAll(category, false)}
                      disabled={!canEdit}
                      className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {category.features.map((feature) => {
                    const draftEnabled = Boolean(draft[feature.key]);
                    const locked = !canEdit || !feature.platformAvailable;
                    const statusLabel = !canEdit
                      ? "Set access plan"
                      : !feature.platformAvailable
                        ? "Unavailable at platform level"
                        : draftEnabled
                          ? "Enabled for this school"
                          : "Disabled for this school";
                    const statusTone = locked ? "amber" : draftEnabled ? "emerald" : "slate";

                    return (
                      <article key={feature.key} className={`rounded-2xl border bg-white p-4 shadow-sm ${locked ? "opacity-90" : ""}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="font-bold text-slate-950">{feature.label}</h5>
                              <Pill tone={statusTone}>{statusLabel}</Pill>
                            </div>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{feature.key.replace(/_/g, " ")}</p>
                          </div>
                          <label className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${locked ? "cursor-not-allowed bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-700"}`}>
                            <input
                              type="checkbox"
                              checked={draftEnabled}
                              disabled={locked}
                              onChange={(event) => setDraft((current) => ({ ...current, [feature.key]: event.target.checked }))}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            />
                            Toggle
                          </label>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                          <Meta
                            label="Last modified"
                            value={feature.lastModified ? new Date(feature.lastModified).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Never"}
                          />
                          <Meta label="Modified by" value={feature.modifiedBy ?? "System"} />
                        </div>

                        <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">
                          Enable this module to make it available to the school. The school administrator will configure operational permissions.
                        </p>

                        {locked ? (
                          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            {canEdit
                              ? "This module is not available at the platform level."
                              : "Set the access plan before changing school entitlements."}
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-500">
            No features match your search.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Saving…" : "Save features"}
          </button>
          <p className="text-sm text-slate-500">
            {canEdit
              ? "Changes are saved immediately to this school&apos;s entitlement record."
              : "Set the access plan first, then return here to manage features."}
          </p>
        </div>
      </form>

      {state.message ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 top-4 z-50 max-w-md rounded-2xl border p-4 shadow-2xl ${
            state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <p className="font-semibold">{state.message}</p>
          {state.savedAt ? <p className="mt-1 text-xs opacity-80">Saved {new Date(state.savedAt).toLocaleString("en-IN")}</p> : null}
        </div>
      ) : null}

      <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <h4 className="text-lg font-bold text-slate-900">Recent audit</h4>
        <div className="mt-4 space-y-3">
          {audits.length ? audits.map((audit) => (
            <div key={audit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
              <div>
                <strong>{audit.featureLabel}</strong>
                <span className="ml-2 text-slate-500">{audit.action === "ENABLE" ? "enabled" : "disabled"}</span>
              </div>
              <div className="text-slate-500">
                {audit.by ?? "System"} · {new Date(audit.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </div>
          )) : (
            <p className="text-sm text-slate-500">No feature changes have been recorded yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white px-4 py-3 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Pill({ tone, children }: { tone: "emerald" | "amber" | "slate"; children: ReactNode }) {
  const toneClasses = {
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${toneClasses}`}>{children}</span>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
