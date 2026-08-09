"use client";

import { useState } from "react";
import V2ContentDocumentRenderer from "@/components/content/V2ContentDocumentRenderer";
import { getSchoolTeachingPlanPreviewAction } from "@/app/school-dashboard/teaching-plans/actions";
import type { SchoolTeachingPlanDetail } from "@/lib/school-teaching-plan";

type Preview = Awaited<ReturnType<typeof getSchoolTeachingPlanPreviewAction>>;

export default function SchoolTeachingPlanDetail({ detail }: { detail: SchoolTeachingPlanDetail }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function previewPage(periodId: string, pageRefId: string) {
    const key = `${periodId}:${pageRefId}`;
    setLoadingKey(key);
    setError("");
    try {
      setPreview(await getSchoolTeachingPlanPreviewAction({ planId: detail.id, periodId, pageRefId }));
    } catch {
      setPreview(null);
      setError("This page preview is no longer available.");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="teaching-plan-detail">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Read-only School view</p>
        <h2 id="teaching-plan-detail" className="mt-1 text-lg font-semibold">{detail.bookTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{detail.className} · Section {detail.sectionName} · {detail.subjectName}</p>
        <p className="mt-1 text-xs text-slate-500">Teacher: {detail.teacherName} · {detail.academicYearName} · {detail.periodCount} periods · {detail.mappedPageCount} mapped pages</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="planner-context">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="planner-context" className="text-sm font-semibold">Academic Planner context</h3>
            <p className="mt-1 text-xs text-slate-500">Planner dates are shown as existing calendar context. Teaching Period order is not a calendar schedule.</p>
          </div>
          <a href="/school-dashboard/planner" className="text-xs font-semibold text-blue-700">Open Planner</a>
        </div>
        {detail.plannerContext.length ? (
          <ul className="mt-3 divide-y rounded-lg border border-slate-100">
            {detail.plannerContext.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 p-2 text-sm">
                <span className="font-medium">{item.title}</span>
                <span className="text-xs text-slate-500">{new Date(item.currentDate).toLocaleDateString()} · {item.status}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No existing Teaching planner items for this scope.</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="period-list">
        <div className="flex items-center justify-between gap-3">
          <h3 id="period-list" className="text-sm font-semibold">Ordered Teaching Periods</h3>
          <span className="text-xs text-slate-500">{detail.periods.length} total</span>
        </div>
        <div className="mt-3 space-y-2">
          {detail.periods.map((period) => (
            <article key={period.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Period {period.sequence}: {period.title}</h4>
                <span className="text-xs text-slate-500">{period.pageRefs.length} pages</span>
              </div>
              {period.pageRefs.length ? (
                <ol className="mt-2 space-y-1">
                  {period.pageRefs.map((page) => {
                    const key = `${period.id}:${page.refId}`;
                    const missing = page.state === "MISSING_PAGE";
                    return (
                      <li key={page.refId} className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">Page {page.displayPageNumber ?? "—"} · {page.title}</span>
                          <span className="block text-xs text-slate-500">{page.moduleTitle ?? "Module unavailable"} · {page.state === "CURRENT" ? "Current" : page.state === "SOURCE_CHANGED" ? "Publisher content updated" : page.state === "MISSING_PAGE" ? "Page no longer available" : "Page status unavailable"}</span>
                        </span>
                        {!missing ? <button type="button" onClick={() => previewPage(period.id, page.refId)} disabled={loadingKey === key} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold disabled:opacity-60">{loadingKey === key ? "Loading…" : "Preview"}</button> : null}
                      </li>
                    );
                  })}
                </ol>
              ) : <p className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-slate-500">No pages mapped to this period.</p>}
            </article>
          ))}
          {!detail.periods.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No Teaching Periods have been defined.</p> : null}
        </div>
      </section>

      {error ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p> : null}
      {preview ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm" aria-labelledby="school-page-preview">
          <div className="flex items-center justify-between gap-3">
            <h3 id="school-page-preview" className="text-sm font-semibold">Page preview · {preview.metadata.title}</h3>
            <button type="button" onClick={() => setPreview(null)} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold">Close</button>
          </div>
          <div className="mt-3 max-h-[65vh] overflow-y-auto rounded-lg bg-white p-2">
            <V2ContentDocumentRenderer
              document={preview.document}
              mode="STUDENT"
              linkedAssets={preview.linkedAssets}
              activities={preview.activities}
              worksheets={preview.worksheets}
              media={preview.media}
              sectionDefinitions={preview.sectionDefinitions}
              knowledgeDefinitions={preview.knowledgeDefinitions}
              resourceUrls={preview.resourceUrls}
              pageNumberOffset={preview.metadata.displayPageNumber - 1}
            />
          </div>
        </section>
      ) : null}
    </section>
  );
}
