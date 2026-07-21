import Link from "next/link";
import { Search, Users } from "lucide-react";
import { getStudents } from "@/lib/academic";
import { createStudent, setStudentActive } from "../academic-actions";

export const dynamic = "force-dynamic";

const input = "w-full rounded-xl border px-4 py-3";

type Params = {
  query?: string;
  year?: string;
  classId?: string;
  sectionId?: string;
  active?: "active" | "inactive";
  login?: "enabled" | "disabled";
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const query = params.query?.trim();
  const filters = {
    query,
    academicYearId: params.year,
    schoolClassId: params.classId,
    sectionId: params.sectionId,
    active: params.active,
    login: params.login,
  };
  const { students, years } = await getStudents(filters);
  const classes = years.flatMap((year) => year.classes.map((item) => ({
    id: item.id,
    yearId: year.id,
    yearName: year.name,
    name: item.name,
    sections: item.sections,
  })));
  const sections = classes.flatMap((schoolClass) =>
    schoolClass.sections.map((section) => ({
      id: section.id,
      schoolClassId: schoolClass.id,
      yearId: schoolClass.yearId,
      label: `${schoolClass.yearName} - ${schoolClass.name} - ${section.name}`,
    })),
  );

  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-3xl font-bold">Students</h1>
        <p className="mt-2 text-slate-600">
          Add students, maintain enrollment history, and prepare student login safely.
        </p>
      </header>

      <details className="rounded-3xl border bg-white p-6 shadow-sm" open>
        <summary className="cursor-pointer text-lg font-bold text-blue-700">
          Add student
        </summary>
        <form action={createStudent} className="mt-6 space-y-6">
          <section>
            <h2 className="text-lg font-bold">Basic information</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <input name="admissionNumber" required placeholder="Admission number" className={input} />
              <input name="firstName" required placeholder="First name" className={input} />
              <input name="lastName" required placeholder="Last name" className={input} />
              <input name="displayName" placeholder="Display name (optional)" className={input} />
              <input name="dateOfBirth" type="date" required className={input} />
              <input name="joinDate" type="date" required className={input} />
              <input name="email" type="email" placeholder="Student email (optional)" className={input} />
              <input name="studentPhone" placeholder="Student phone (optional)" className={input} />
              <input name="gender" placeholder="Gender (optional)" className={input} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold">Enrollment</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <select name="academicYearId" required className={input} defaultValue="">
                <option value="">Academic year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
              <select name="schoolClassId" required className={input} defaultValue="">
                <option value="">Class</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.yearName} - {schoolClass.name}
                  </option>
                ))}
              </select>
              <select name="sectionId" required className={input} defaultValue="">
                <option value="">Section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
              <input name="rollNumber" placeholder="Roll number (optional)" className={input} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold">Guardian</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <input name="guardianName" placeholder="Guardian name (optional)" className={input} />
              <input name="guardianPhone" required placeholder="Guardian phone" className={input} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold">Status</h2>
            <label className="mt-3 inline-flex items-center gap-3 rounded-xl border px-4 py-3">
              <input name="active" type="checkbox" defaultChecked />
              Student is active
            </label>
          </section>

          <button className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">
            Add student
          </button>
        </form>
      </details>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Filters</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative xl:col-span-2">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              name="query"
              defaultValue={query}
              placeholder="Search by name or admission number"
              className="w-full rounded-xl border py-3 pl-12 pr-4"
            />
          </label>
          <select name="year" defaultValue={params.year ?? ""} className={input}>
            <option value="">All academic years</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
          <select name="classId" defaultValue={params.classId ?? ""} className={input}>
            <option value="">All classes</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.yearName} - {schoolClass.name}
              </option>
            ))}
          </select>
          <select name="sectionId" defaultValue={params.sectionId ?? ""} className={input}>
            <option value="">All sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
          <select name="active" defaultValue={params.active ?? ""} className={input}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select name="login" defaultValue={params.login ?? ""} className={input}>
            <option value="">All login states</option>
            <option value="enabled">Login enabled</option>
            <option value="disabled">Login not enabled</option>
          </select>
          <div className="flex gap-3 xl:col-span-4">
            <button className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Apply filters</button>
            <Link href="/school-dashboard/students" className="rounded-xl border px-6 py-3 font-semibold">
              Clear filters
            </Link>
          </div>
        </form>
      </section>

      <section>
        <p className="mb-3 text-sm font-semibold text-slate-600">{students.length} students found</p>
        {students.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => {
              const enrollment = student.enrollments[0];
              const loginEnabled = Boolean(student.userId);
              const displayName = student.displayName || student.name;
              return (
                <article key={student.id} className="rounded-3xl border bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-bold">{displayName}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${student.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                      {student.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Admission {student.admissionNumber}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {enrollment
                      ? `${enrollment.schoolClass.name} - ${enrollment.section.name}`
                      : "Not enrolled"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">Roll {enrollment?.rollNumber || "Not set"}</p>
                  <p className="mt-1 text-sm text-slate-600">Guardian {student.guardianPhone || "Not set"}</p>
                  <p className="mt-1 text-sm text-slate-600">Login {loginEnabled ? "Enabled" : "Not enabled"}</p>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Link href={`/school-dashboard/students/${student.id}`} className="rounded-xl border px-3 py-2 text-center font-semibold">
                      View / Edit
                    </Link>
                    <Link href={`/school-dashboard/students/${student.id}#move-student`} className="rounded-xl border px-3 py-2 text-center font-semibold">
                      Move Section
                    </Link>
                    <Link href={`/school-dashboard/students/${student.id}#login-readiness`} className="rounded-xl border px-3 py-2 text-center font-semibold">
                      {loginEnabled ? "Login Status" : "Prepare Login"}
                    </Link>
                    <form action={setStudentActive}>
                      <input type="hidden" name="studentId" value={student.id} />
                      <input type="hidden" name="active" value={student.active ? "false" : "true"} />
                      <button className="w-full rounded-xl border px-3 py-2 text-center font-semibold">
                        {student.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border bg-white p-14 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-xl font-bold">No students found</h2>
            <p className="mt-2 text-slate-500">Try changing filters or add a new student.</p>
          </div>
        )}
      </section>
    </main>
  );
}
