import Link from "next/link";
import { UserRoundCheck } from "lucide-react";
import TeacherAssignmentSelect from "@/components/school/TeacherAssignmentSelect";
import { getTeacherAssignments } from "@/lib/academic";
import { buildAcademicCoverage } from "@/lib/school-academic-management";

export const dynamic = "force-dynamic";

export default async function TeacherAssignmentsPage() {
  const { assignments, teachers, years } = await getTeacherAssignments();
  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.user.name,
    summary: teacher.assignments.map((item) => `${item.type === "CLASS_TEACHER" ? "Class teacher" : item.subject?.name}: ${item.schoolClass.name} · Section ${item.section.name}`).join(" · "),
  }));
  const sections = years.flatMap((year) => year.classes.flatMap((schoolClass) => schoolClass.sections.map((section) => ({ year, schoolClass, section }))));
  const coverage = buildAcademicCoverage({
    sections: sections.map(({ section }) => ({ id: section.id })),
    sectionSubjects: sections.flatMap(({ section }) => section.subjects.map((item) => ({ sectionId: section.id, subjectId: item.subjectId }))),
    assignments: assignments.map((item) => ({ sectionId: item.sectionId, subjectId: item.subjectId, type: item.type })),
  });
  const teachersWithoutAssignments = teachers.filter((teacher) => teacher.assignments.length === 0).length;

  return <main className="space-y-7 p-4 sm:p-6 lg:p-8"><header><h1 className="text-3xl font-bold">Teacher Assignments</h1><p className="mt-2 text-slate-600">Assign one class teacher and one teacher for every offered subject in the current academic year.</p></header>
    {years[0] ? <p className="rounded-2xl bg-blue-50 p-4 font-semibold text-blue-800">Current academic year: {years[0].name}</p> : null}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Active teachers" value={teachers.length}/><Summary label="Teachers without assignments" value={teachersWithoutAssignments} warning/><Summary label="Sections without class teachers" value={coverage.missingClassTeachers} warning/><Summary label="Subjects without teachers" value={coverage.missingSubjectTeachers} warning/></section>
    {!teachers.length && years.length ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">No approved active teachers are available. <Link href="/school-dashboard/teacher-requests" className="font-bold underline">Review teacher requests</Link> or <Link href="/school-dashboard/teachers" className="font-bold underline">manage teachers</Link>.</p> : null}
    {sections.length ? <div className="grid gap-6 xl:grid-cols-2">{sections.map(({ year, schoolClass, section }) => {
      const sectionAssignments = assignments.filter((item) => item.sectionId === section.id);
      const classTeacher = sectionAssignments.find((item) => item.type === "CLASS_TEACHER");
      const missingSubjects = section.subjects.filter((link) => !sectionAssignments.some((item) => item.type === "SUBJECT_TEACHER" && item.subjectId === link.subjectId)).length;
      return <section key={section.id} className={`rounded-3xl border bg-white p-6 shadow-sm ${!classTeacher || missingSubjects ? "border-amber-200" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wider text-blue-700">{schoolClass.name}</p><h2 className="mt-1 text-2xl font-bold">Section {section.name}</h2></div>{!classTeacher || missingSubjects ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Incomplete</span> : <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Complete</span>}</div><div className="mt-5 space-y-4"><TeacherAssignmentSelect label="Class Teacher" teachers={teacherOptions} currentTeacherId={classTeacher?.teacherId ?? ""} sectionId={section.id} academicYearId={year.id} type="CLASS_TEACHER"/>{section.subjects.map((link) => { const assignment = sectionAssignments.find((item) => item.type === "SUBJECT_TEACHER" && item.subjectId === link.subjectId); return <TeacherAssignmentSelect key={link.id} label={link.subject.name} teachers={teacherOptions} currentTeacherId={assignment?.teacherId ?? ""} sectionId={section.id} academicYearId={year.id} subjectId={link.subjectId} type="SUBJECT_TEACHER"/>; })}{!section.subjects.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">No subjects are offered in this section. <Link href={`/school-dashboard/classes/${schoolClass.id}`} className="font-bold underline">Manage section subjects</Link>.</p>}</div></section>;
    })}</div> : <div className="rounded-3xl border bg-white p-14 text-center"><UserRoundCheck className="mx-auto h-12 w-12 text-slate-300"/><h2 className="mt-4 text-xl font-bold">No active sections in the current academic year</h2><p className="mt-2 text-slate-500">Set up the current year, classes, and sections before assigning teachers.</p><Link href={years.length ? "/school-dashboard/classes" : "/school-dashboard/academic-years"} className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">{years.length ? "Manage classes" : "Set up academic year"}</Link></div>}
  </main>;
}

function Summary({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className={`rounded-2xl border bg-white p-5 ${warning && value ? "border-amber-300" : ""}`}><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-600">{label}</p></div>;
}
