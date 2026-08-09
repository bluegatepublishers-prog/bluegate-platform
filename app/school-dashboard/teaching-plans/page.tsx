import Link from "next/link";
import SchoolTeachingPlanDetail from "@/components/school/SchoolTeachingPlanDetail";
import { getSchoolTeachingPlanPageData } from "@/lib/school-teaching-plan";

export const dynamic = "force-dynamic";

export default async function SchoolTeachingPlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    academicYearId: params.academicYearId,
    sectionId: params.sectionId,
    sectionSubjectId: params.sectionSubjectId,
    teacherId: params.teacherId,
    bookId: params.bookId,
  };
  const data = await getSchoolTeachingPlanPageData(filters, params.planId);
  const queryFor = (planId?: string) => {
    const query = new URLSearchParams();
    Object.entries({ ...filters, ...(planId ? { planId } : {}) }).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    return query.toString();
  };

  return (
    <main className="space-y-4 p-3 sm:p-4 lg:p-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Academics · read-only</p>
        <h1 className="mt-1 text-xl font-semibold">Teaching Plans</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">Review the teacher-owned Teaching Period sequence and publisher page mappings for this school. School users cannot edit plans or publisher content here.</p>
      </header>

      <form className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs font-semibold text-slate-700">Academic year
          <select name="academicYearId" defaultValue={data.selectedAcademicYearId} className="mt-1 h-9 w-full rounded-lg border px-2 text-sm">
            {data.years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.current ? " (Current)" : ""}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">Class / section
          <select name="sectionId" defaultValue={params.sectionId ?? ""} className="mt-1 h-9 w-full rounded-lg border px-2 text-sm">
            <option value="">All sections</option>
            {data.sections.map((section) => <option key={section.id} value={section.id}>{section.className} · {section.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">Subject
          <select name="sectionSubjectId" defaultValue={params.sectionSubjectId ?? ""} className="mt-1 h-9 w-full rounded-lg border px-2 text-sm">
            <option value="">All subjects</option>
            {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">Teacher
          <select name="teacherId" defaultValue={params.teacherId ?? ""} className="mt-1 h-9 w-full rounded-lg border px-2 text-sm">
            <option value="">All teachers</option>
            {data.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">Book
          <select name="bookId" defaultValue={params.bookId ?? ""} className="mt-1 h-9 w-full rounded-lg border px-2 text-sm">
            <option value="">All books</option>
            {data.books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="h-9 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white">Filter</button>
          <Link href="/school-dashboard/teaching-plans" className="h-9 rounded-lg border px-3 py-2 text-xs font-semibold">Reset</Link>
        </div>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="school-plan-list">
        <div className="flex items-center justify-between gap-3">
          <h2 id="school-plan-list" className="text-sm font-semibold">Available Teaching Plans</h2>
          <span className="text-xs text-slate-500">{data.plans.length} plans</span>
        </div>
        {data.plans.length ? (
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {data.plans.map((plan) => (
              <Link key={plan.id} href={`/school-dashboard/teaching-plans?${queryFor(plan.id)}`} className={`rounded-lg border p-3 transition hover:border-blue-300 hover:bg-blue-50 ${data.selectedPlan?.id === plan.id ? "border-blue-500 bg-blue-50" : "border-slate-100"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-sm font-semibold">{plan.className} · Section {plan.sectionName} · {plan.subjectName}</span>
                  <span className="text-xs text-slate-500">{plan.periodCount} periods</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{plan.bookTitle} · Teacher: {plan.teacherName}</p>
                <p className="mt-1 text-[11px] text-slate-500">{plan.mappedPageCount} mapped pages</p>
              </Link>
            ))}
          </div>
        ) : <p className="mt-3 rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">No entitled Teaching Plans match these filters.</p>}
      </section>

      {data.selectedPlan ? <SchoolTeachingPlanDetail detail={data.selectedPlan} /> : params.planId ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">That Teaching Plan is not available in this School scope.</p> : null}
    </main>
  );
}
