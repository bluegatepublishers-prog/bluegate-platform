"use client";

import Link from "next/link";
import { Grid2X2, List, School, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";

type Classroom = {
  sectionId: string;
  academicYearName: string;
  current: boolean;
  className: string;
  sectionName: string;
  studentCount: number;
  classTeacher: boolean;
  subjects: Array<{ id: string; name: string }>;
};

export default function ClassesView({ classes, userId }: { classes: Classroom[]; userId: string }) {
  const key = `sarthi:teacher:${userId}:classes-view`;
  const [view, setView] = useState<"card" | "list">("card");
  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored === "card" || stored === "list") {
      const frame = window.requestAnimationFrame(() => setView(stored));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [key]);
  const choose = (next: "card" | "list") => {
    setView(next);
    window.localStorage.setItem(key, next);
  };

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{classes.length} assigned {classes.length === 1 ? "class" : "classes"}</p>
        <div className="inline-flex rounded-xl border bg-white p-1" aria-label="Class view">
          <button type="button" onClick={() => choose("card")} aria-pressed={view === "card"} className={`min-h-11 rounded-lg px-4 ${view === "card" ? "bg-blue-600 text-white" : "text-slate-700"}`}><Grid2X2 className="h-5 w-5" /><span className="sr-only">Card view</span></button>
          <button type="button" onClick={() => choose("list")} aria-pressed={view === "list"} className={`min-h-11 rounded-lg px-4 ${view === "list" ? "bg-blue-600 text-white" : "text-slate-700"}`}><List className="h-5 w-5" /><span className="sr-only">List view</span></button>
        </div>
      </div>
      {view === "card" ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((item) => <ClassCard key={item.sectionId} item={item} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((item) => <ClassListItem key={item.sectionId} item={item} />)}
        </div>
      )}
    </section>
  );
}

function ClassCard({ item }: { item: Classroom }) {
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-blue-700">{item.academicYearName}{item.current ? " · Current" : ""}</p>
          <h2 className="mt-2 break-words text-2xl font-bold">{item.className} · Section {item.sectionName}</h2>
        </div>
        <School className="h-7 w-7 shrink-0 text-blue-600" />
      </div>
      <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600"><UsersRound className="h-4 w-4" />{item.studentCount} enrolled</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.classTeacher ? <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">Class teacher</span> : null}
        {item.subjects.map((subject) => <span key={subject.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{subject.name}</span>)}
      </div>
      <Link href={`/teacher-dashboard/classes/${item.sectionId}`} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Open class</Link>
    </article>
  );
}

function ClassListItem({ item }: { item: Classroom }) {
  return (
    <article className="grid min-w-0 gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-bold text-blue-700">{item.academicYearName}{item.current ? " · Current" : ""}</p>
        <h2 className="mt-1 break-words text-xl font-bold">{item.className} · Section {item.sectionName}</h2>
        <p className="mt-2 text-sm text-slate-600">{item.studentCount} enrolled · {item.classTeacher ? "Class teacher" : item.subjects.map((subject) => subject.name).join(", ")}</p>
      </div>
      <Link href={`/teacher-dashboard/classes/${item.sectionId}`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-blue-300 px-5 py-3 font-bold text-blue-700">Open class</Link>
    </article>
  );
}
