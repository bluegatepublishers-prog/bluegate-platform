"use client";

import Link from "next/link";
import { LayoutGrid, List, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AssignmentRow = {
  id: string;
  title: string;
  assignmentType: string;
  status: string;
  subjectName: string | null;
  publishAt: string | null;
  dueAt: string | null;
  updatedAt: string;
  summary: {
    eligible: number;
    submitted: number;
    pending: number;
    needsReview: number;
    resubmitted: number;
    late: number;
    graded: number;
  };
};

const filters = ["ACTIVE", "DRAFT", "SCHEDULED", "CLOSED", "ARCHIVED"] as const;

export default function AssignmentList({ sectionId, assignments, subjectId }: { sectionId: string; assignments: AssignmentRow[]; subjectId?: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("ACTIVE");
  const [subject, setSubject] = useState("");
  const [view, setView] = useState<"card" | "list">("list");
  useEffect(() => {
    const saved = localStorage.getItem("teacher-assignment-view");
    requestAnimationFrame(() => {
      if (saved === "card" || saved === "list") setView(saved);
    });
  }, []);
  const subjects = useMemo(() => [...new Set(assignments.map((item) => item.subjectName).filter(Boolean))] as string[], [assignments]);
  const visible = useMemo(() => assignments.filter((item) => {
    const matchesFilter = filter === "ACTIVE"
      ? ["PUBLISHED", "SCHEDULED"].includes(item.status)
      : item.status === filter;
    return matchesFilter &&
      (!subject || item.subjectName === subject) &&
      item.title.toLowerCase().includes(query.trim().toLowerCase());
  }), [assignments, filter, query, subject]);
  const changeView = (next: "card" | "list") => {
    setView(next);
    localStorage.setItem("teacher-assignment-view", next);
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Assignments</h2>
          <p className="mt-1 text-slate-600">Create, publish, review, and return classroom work.</p>
        </div>
        <Link href={"/teacher-dashboard/classes/" + sectionId + "/assignments/new" + (subjectId ? "?subject=" + encodeURIComponent(subjectId) : "")} className="inline-flex min-h-10 items-center rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">Create Assignment</Link>
      </div>
      <section className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2" aria-label="Assignment status filters">
          {filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-bold ${filter === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{label(item)}</button>)}
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(160px,240px)_auto]">
          <label className="relative min-w-0"><span className="sr-only">Search assignments</span><Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title" className="min-h-12 w-full rounded-xl border py-3 pl-11 pr-4" /></label>
          <label><span className="sr-only">Filter by subject</span><select value={subject} onChange={(event) => setSubject(event.target.value)} className="min-h-12 w-full rounded-xl border px-4"><option value="">All subjects</option>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="flex rounded-xl border p-1" aria-label="Assignment view">
            <button type="button" aria-label="List view" onClick={() => changeView("list")} className={`min-h-10 rounded-lg px-3 ${view === "list" ? "bg-blue-600 text-white" : ""}`}><List className="h-5 w-5" /></button>
            <button type="button" aria-label="Card view" onClick={() => changeView("card")} className={`min-h-10 rounded-lg px-3 ${view === "card" ? "bg-blue-600 text-white" : ""}`}><LayoutGrid className="h-5 w-5" /></button>
          </div>
        </div>
      </section>
      {visible.length ? <div className={view === "card" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
        {visible.map((item) => <AssignmentItem key={item.id} sectionId={sectionId} item={item} compact={view === "list"} />)}
      </div> : <section className="rounded-2xl border bg-white p-10 text-center"><h3 className="text-xl font-bold">No matching assignments</h3><p className="mt-2 text-slate-600">Try another filter or create the first assignment for this class.</p></section>}
    </div>
  );
}

function AssignmentItem({ sectionId, item, compact }: { sectionId: string; item: AssignmentRow; compact: boolean }) {
  return <article className={`min-w-0 rounded-2xl border bg-white p-5 shadow-sm ${compact ? "sm:flex sm:items-center sm:justify-between sm:gap-5" : ""}`}>
    <div className="min-w-0">
      <div className="flex flex-wrap gap-2"><Badge value={item.status} /><Badge value={label(item.assignmentType)} neutral /></div>
      <h3 className="mt-3 break-words text-lg font-bold">{item.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{item.subjectName ?? "General class work"}{item.dueAt ? ` · Due ${formatDate(item.dueAt)}` : " · No due date"}</p>
    </div>
    <div className={`mt-4 grid grid-cols-3 gap-2 text-center ${compact ? "sm:mt-0 sm:min-w-72" : ""}`}>
      <Metric label="Submitted" value={item.summary.submitted} />
      <Metric label="Needs review" value={item.summary.needsReview} />
      <Metric label="Graded" value={item.summary.graded} />
    </div>
    <Link href={`/teacher-dashboard/classes/${sectionId}/assignments/${item.id}`} className={`mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 font-bold text-blue-700 ${compact ? "sm:mt-0" : "w-full"}`}>{item.summary.needsReview ? "Review submissions" : "Open"}</Link>
  </article>;
}

function Metric({ label: text, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 p-2"><strong className="block text-lg">{value}</strong><span className="text-xs text-slate-500">{text}</span></div>;
}
function Badge({ value, neutral = false }: { value: string; neutral?: boolean }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${neutral ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-700"}`}>{label(value)}</span>;
}
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }

