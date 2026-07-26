"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type Row = {
  id: string;
  title: string;
  subjectName: string | null;
  assignmentType: string;
  teacherName: string;
  publishedAt: string | null;
  dueAt: string | null;
  status: string;
  isLate: boolean;
  marksAwarded: number | null;
  totalMarks: number | null;
};

export default function StudentAssignmentList({ assignments }: { assignments: Row[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const visible = useMemo(() => assignments.filter((item) =>
    (!status || item.status === status) &&
    `${item.title} ${item.subjectName ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [assignments, query, status]);
  return <div className="space-y-5">
    <header><p className="font-bold text-blue-700">Classroom</p><h1 className="mt-1 text-3xl font-bold">Assignments</h1><p className="mt-2 text-slate-600">Your current class work, due dates, feedback, and released results.</p></header>
    <section className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[minmax(0,1fr)_200px]">
      <label className="relative"><span className="sr-only">Search assignments</span><Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assignments" className="min-h-12 w-full rounded-xl border py-3 pl-11 pr-4" /></label>
      <label><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-12 w-full rounded-xl border px-4"><option value="">All statuses</option>{["UPCOMING","DUE","SUBMITTED","RESUBMITTED","RETURNED","GRADED","CLOSED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
    </section>
    {visible.length ? <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <Link key={item.id} href={`/student-dashboard/assignments/${item.id}`} className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-blue-600"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{label(item.status)}</span>{item.isLate ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Late</span> : null}</div><h2 className="mt-3 break-words text-xl font-bold">{item.title}</h2><p className="mt-2 text-sm text-slate-600">{item.subjectName ?? "General"} · {label(item.assignmentType)}</p><p className="mt-1 text-sm text-slate-500">{item.teacherName}</p><p className="mt-4 font-semibold">{item.dueAt ? `Due ${formatDate(item.dueAt)}` : "No due date"}</p>{item.marksAwarded !== null ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">Marks: {item.marksAwarded}{item.totalMarks !== null ? ` / ${item.totalMarks}` : ""}</p> : null}</Link>)}</section> : <section className="rounded-2xl border bg-white p-10 text-center"><h2 className="text-xl font-bold">No assignments found</h2><p className="mt-2 text-slate-600">New published work for your current class will appear here.</p></section>}
  </div>;
}

function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }

