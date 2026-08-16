"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2, LibraryBig, X } from "lucide-react";
import { SchoolSection, schoolTypography } from "@/components/school/SchoolUI";

export type SchoolBookAssignmentAction = (formData: FormData) => void | Promise<void>;

export type SchoolBookAssignmentSubject = {
  id: string;
  subjectName: string;
  assignedBookId: string | null;
  assignedBookTitle: string | null;
  books: { id: string; title: string }[];
  assignAction: SchoolBookAssignmentAction;
};

export type SchoolBookAssignmentSection = {
  id: string;
  name: string;
  subjects: SchoolBookAssignmentSubject[];
};

export type SchoolBookAssignmentClass = {
  id: string;
  name: string;
  sections: SchoolBookAssignmentSection[];
};

export default function SchoolBookAssignmentWorkspace({ classes, entitledBookCount }: { classes: SchoolBookAssignmentClass[]; entitledBookCount: number }) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [dialogSubject, setDialogSubject] = useState<SchoolBookAssignmentSubject | null>(null);
  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? classes[0];
  const selectedSection = selectedClass?.sections.find((item) => item.id === selectedSectionId) ?? selectedClass?.sections[0];
  const assignedCount = selectedSection?.subjects.filter((item) => item.assignedBookId).length ?? 0;
  const pendingCount = (selectedSection?.subjects.length ?? 0) - assignedCount;

  return (
    <>
      <SchoolSection title="Book assignment" description="Choose a class and section to manage its subject books.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
          <div className="flex items-center gap-2"><LibraryBig className="h-4 w-4 text-blue-700" aria-hidden="true" /><span className="text-sm font-semibold text-slate-800">Available school books</span></div>
          <strong className="text-lg text-blue-800">{entitledBookCount}</strong>
        </div>
        {classes.length ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Classes">
              {classes.map((item) => <button key={item.id} type="button" role="tab" aria-selected={selectedClass?.id === item.id} onClick={() => { setSelectedClassId(item.id); setSelectedSectionId(""); }} className={"rounded-lg px-3 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 " + (selectedClass?.id === item.id ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50")}>{item.name}</button>)}
            </div>
            {selectedClass ? <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Sections in {selectedClass.name}</p><div className="mt-2 flex flex-wrap gap-2" role="tablist" aria-label={selectedClass.name + " sections"}>{selectedClass.sections.map((item) => <button key={item.id} type="button" role="tab" aria-selected={selectedSection?.id === item.id} onClick={() => setSelectedSectionId(item.id)} className={"rounded-lg px-3 py-1.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 " + (selectedSection?.id === item.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-blue-50")}>Section {item.name}</button>)}</div></div> : null}
            {selectedSection ? <div className="mt-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className={schoolTypography.sectionTitle}>{selectedClass?.name} · Section {selectedSection.name}</h3><p className={"mt-1 " + schoolTypography.helper}>{selectedSection.subjects.length} subjects · {assignedCount} books assigned · {pendingCount} pending</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{assignedCount}/{selectedSection.subjects.length} assigned</span></div><div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{selectedSection.subjects.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4"><div className="flex min-w-0 items-center gap-3"><span className={"grid h-9 w-9 shrink-0 place-items-center rounded-lg " + (item.assignedBookId ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{item.assignedBookId ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <BookOpen className="h-4 w-4" aria-hidden="true" />}</span><div className="min-w-0"><p className="text-sm font-bold text-slate-800">{item.subjectName}</p>{item.assignedBookTitle ? <p className="mt-0.5 truncate text-xs text-slate-500">{item.assignedBookTitle}</p> : <p className="mt-0.5 text-xs font-semibold text-amber-700">Not assigned</p>}</div></div><button type="button" onClick={() => setDialogSubject(item)} className={"rounded-lg px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 " + (item.assignedBookId ? "border border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-blue-700 text-white hover:bg-blue-800")}>{item.assignedBookId ? "Change" : "Assign"}</button></div>)}</div></div> : <div className="mt-4 rounded-xl bg-slate-50 p-6 text-center"><p className="text-sm text-slate-500">Create an active section and subject to assign books.</p></div>}
          </>
        ) : <div className="mt-4 rounded-xl bg-slate-50 p-8 text-center"><LibraryBig className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" /><p className="mt-2 text-sm text-slate-500">Create classes, sections, and subjects first.</p></div>}
      </SchoolSection>
      {dialogSubject ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogSubject(null); }}><div role="dialog" aria-modal="true" aria-labelledby="book-assignment-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Book assignment</p><h2 id="book-assignment-title" className="mt-1 text-lg font-bold text-slate-950">{dialogSubject.subjectName}</h2><p className="mt-1 text-sm text-slate-500">{selectedClass?.name} · Section {selectedSection?.name}</p></div><button type="button" aria-label="Close book assignment dialog" onClick={() => setDialogSubject(null)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><X className="h-4 w-4" aria-hidden="true" /></button></div><form action={dialogSubject.assignAction} className="mt-5"><input type="hidden" name="sectionSubjectId" value={dialogSubject.id} /><label className="block text-sm font-bold text-slate-700">Available entitled books<select name="bookId" defaultValue={dialogSubject.assignedBookId ?? ""} className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">No book assigned</option>{dialogSubject.books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDialogSubject(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800">Assign Book</button></div></form></div></div> : null}
    </>
  );
}
