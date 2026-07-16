import Link from "next/link";
import { getAssignedStudents } from "@/lib/mentor-dashboard";

export default async function MentorStudentsPage() {
  const students = await getAssignedStudents();
  return <main className="space-y-6 p-4 sm:p-6 lg:p-8"><header><p className="font-bold text-indigo-700">Current assignment scope</p><h1 className="mt-2 text-3xl font-bold">Assigned Students</h1><p className="mt-2 text-slate-600">There is no school-wide or publisher-wide student browser.</p></header>{students.length?<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{students.map(student=><Link key={student.id} href={`/mentor-dashboard/students/${student.id}`} className="rounded-2xl border bg-white p-6 shadow-sm hover:border-indigo-300"><h2 className="text-xl font-bold">{student.name}</h2><p className="mt-2 text-sm text-slate-600">{student.school}</p><p className="mt-1 text-sm text-slate-500">{student.className} · Section {student.sectionName} · {student.academicYear}</p><p className="mt-4 text-xs font-bold uppercase tracking-wide text-indigo-700">{student.role} · {student.source}</p></Link>)}</section>:<div className="rounded-2xl border bg-white p-8 text-slate-600">No eligible active assignment is available.</div>}</main>;
}
