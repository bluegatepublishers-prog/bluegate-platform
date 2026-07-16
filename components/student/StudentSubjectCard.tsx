import Image from "next/image";
import Link from "next/link";
import { BookOpen, FolderOpen, UserRound } from "lucide-react";
import type { StudentSubjectViewModel } from "@/lib/student-subject-policy";

export default function StudentSubjectCard({ subject }: { subject: StudentSubjectViewModel }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="grid min-h-44 grid-cols-[96px_1fr] gap-5 bg-slate-50 p-5">
        {subject.book?.coverImage ? (
          <Image src={subject.book.coverImage} alt={`${subject.book.title} cover`} width={96} height={136} className="h-34 w-24 rounded-lg object-cover shadow" unoptimized />
        ) : (
          <div className="flex h-34 w-24 items-center justify-center rounded-lg bg-white text-slate-300 shadow-sm"><BookOpen className="h-8 w-8" /></div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">My Subject</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">{subject.subjectName}</h2>
          <p className="mt-3 flex items-start gap-2 text-sm text-slate-600"><UserRound className="mt-0.5 h-4 w-4 shrink-0" />{subject.teacherName ?? "Teacher not assigned yet"}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><FolderOpen className="h-4 w-4" />{subject.totalStudentResources} learning resource{subject.totalStudentResources === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {subject.book ? <p className="text-sm text-slate-600"><strong className="text-slate-900">{subject.book.title}</strong><br />{subject.book.series ?? "Series not specified"}</p> : <p className="text-sm text-amber-700">No approved book is available for this subject yet.</p>}
        <Link href={`/student-dashboard/subjects/${subject.sectionSubjectId}`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Open Subject</Link>
      </div>
    </article>
  );
}
