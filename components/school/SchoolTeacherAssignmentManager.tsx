"use client";

import { useActionState, useMemo, useState } from "react";

import {
  saveSchoolTeacherAssignments,
  type AssignmentActionResult,
} from "@/app/school-dashboard/teacher-assignments/actions";

type Teacher = { id: string; name: string; email: string | null };
type Section = {
  id: string;
  academicYearId: string;
  classId: string;
  className: string;
  name: string;
  subjects: Array<{
    id: string;
    subjectId: string;
    name: string;
    bookId: string | null;
    bookTitle: string | null;
  }>;
};
type Book = {
  id: string;
  title: string;
  className: string;
  subjectId: string;
  subjectName: string;
};
type Assignment = {
  teacherId: string;
  sectionId: string;
  subjectIds: string[];
  classTeacher: boolean;
};

const initialState: AssignmentActionResult = { ok: true, message: "" };

function classKey(value: string) {
  return value.trim().toLowerCase().replace(/\b(class|grade|standard|std)\b/g, "").replace(/[^a-z0-9]+/g, "");
}

function fieldError(state: AssignmentActionResult, field: string) {
  return !state.ok && state.field === field ? state.message : null;
}

export default function SchoolTeacherAssignmentManager({
  teachers,
  sections,
  books,
  initial,
}: {
  teachers: Teacher[];
  sections: Section[];
  books: Book[];
  initial?: Assignment;
}) {
  const initialClassId = sections.find((item) => item.id === initial?.sectionId)?.classId ?? sections[0]?.classId ?? "";
  const [classId, setClassId] = useState(initialClassId);
  const classSections = useMemo(() => sections.filter((section) => section.classId === classId), [sections, classId]);
  const [sectionId, setSectionId] = useState(initial?.sectionId ?? classSections[0]?.id ?? "");
  const section = sections.find((item) => item.id === sectionId) ?? classSections[0];
  const [teacherId, setTeacherId] = useState(initial?.teacherId ?? "");
  const [subjectIds, setSubjectIds] = useState(initial?.subjectIds ?? []);
  const [classTeacher, setClassTeacher] = useState(initial?.classTeacher ?? false);
  const [state, formAction, pending] = useActionState(saveSchoolTeacherAssignments, initialState);
  const classes = Array.from(new Map(sections.map((item) => [item.classId, item.className])).entries());
  const teacherError = fieldError(state, "teacherId");
  const classError = fieldError(state, "schoolClassId");
  const sectionError = fieldError(state, "sectionId");

  const chooseClass = (next: string) => {
    setClassId(next);
    const first = sections.find((item) => item.classId === next);
    setSectionId(first?.id ?? "");
    setSubjectIds([]);
  };
  const chooseSection = (next: string) => {
    setSectionId(next);
    const nextSection = sections.find((item) => item.id === next);
    if (nextSection) setClassId(nextSection.classId);
    setSubjectIds([]);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Assignment workspace</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">Assign teacher</h2>
        <p className="mt-1 text-sm text-slate-500">Choose subjects once. Entitled books resolve automatically when there is one valid match.</p>
      </div>
      {!state.ok ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{state.message}</p> : state.message ? <p role="status" aria-live="polite" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{state.message}</p> : null}
      <form action={formAction} className="mt-4 grid gap-4">
        <input type="hidden" name="academicYearId" value={section?.academicYearId ?? ""} />
        <input type="hidden" name="schoolClassId" value={section?.classId ?? ""} />
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            Teacher
            <select id="assignment-teacher" name="teacherId" value={teacherId} onChange={(event) => setTeacherId(event.target.value)} required aria-invalid={Boolean(teacherError)} aria-describedby={teacherError ? "assignment-teacher-error" : undefined} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3">
              <option value="">Select teacher</option>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} - {teacher.email}</option>)}
            </select>
            {teacherError ? <span id="assignment-teacher-error" role="alert" className="mt-1 block text-xs font-semibold text-rose-700">{teacherError}</span> : null}
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Class
            <select id="assignment-class" value={classId} onChange={(event) => chooseClass(event.target.value)} required aria-invalid={Boolean(classError)} aria-describedby={classError ? "assignment-class-error" : undefined} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3">
              {classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            {classError ? <span id="assignment-class-error" role="alert" className="mt-1 block text-xs font-semibold text-rose-700">{classError}</span> : null}
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Section
            <select id="assignment-section" name="sectionId" value={section?.id ?? ""} onChange={(event) => chooseSection(event.target.value)} required aria-invalid={Boolean(sectionError)} aria-describedby={sectionError ? "assignment-section-error" : undefined} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3">
              {classSections.map((item) => <option key={item.id} value={item.id}>Section {item.name}</option>)}
            </select>
            {sectionError ? <span id="assignment-section-error" role="alert" className="mt-1 block text-xs font-semibold text-rose-700">{sectionError}</span> : null}
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-700">Subjects</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(section?.subjects ?? []).map((subject) => {
              const selected = subjectIds.includes(subject.subjectId);
              const candidates = books.filter((book) => book.subjectId === subject.subjectId && classKey(book.className) === classKey(section?.className ?? ""));
              const bookField = "book_" + subject.subjectId;
              const bookError = fieldError(state, bookField);
              return (
                <div key={subject.id} className={"rounded-lg border p-3 text-sm " + (selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white")}>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input type="checkbox" name="subjectIds" value={subject.subjectId} checked={selected} onChange={(event) => setSubjectIds((current) => event.target.checked ? [...current, subject.subjectId] : current.filter((id) => id !== subject.subjectId))} className="mt-0.5" />
                    <span><strong>{subject.name}</strong><span className="mt-1 block text-xs text-slate-500">{subject.bookTitle ? "Book: " + subject.bookTitle : candidates.length === 1 ? "One book - auto-selected" : candidates.length > 1 ? candidates.length + " books - choose below" : "No entitled book available"}</span></span>
                  </label>
                  {selected && candidates.length > 1 ? <span className="mt-3 block space-y-1.5 border-t border-blue-100 pt-2">{candidates.map((book) => <label key={book.id} className="flex items-center gap-2 text-xs font-normal"><input type="radio" name={bookField} value={book.id} defaultChecked={book.id === subject.bookId} required aria-invalid={Boolean(bookError)} aria-describedby={bookError ? bookField + "-error" : undefined} />{book.title}</label>)}</span> : null}
                  {selected && candidates.length === 1 ? <input type="hidden" name={bookField} value={candidates[0].id} /> : null}
                  {bookError ? <p id={bookField + "-error"} role="alert" className="mt-2 text-xs font-semibold text-rose-700">{bookError}</p> : null}
                </div>
              );
            })}
          </div>
        </fieldset>
        <label className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" name="classTeacher" checked={classTeacher} onChange={(event) => setClassTeacher(event.target.checked)} /> Make class teacher</label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="reset" disabled={pending} onClick={() => { setTeacherId(""); setSubjectIds([]); setClassTeacher(false); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-60">Clear</button>
          <button disabled={pending} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{pending ? "Saving..." : "Save assignment"}</button>
        </div>
      </form>
    </section>
  );
}
