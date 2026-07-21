import Link from "next/link";
import ActivationCodeIssuer from "@/components/onboarding/ActivationCodeIssuer";
import { moveStudentEnrollment, updateStudent } from "@/app/school-dashboard/academic-actions";
import { getStudent } from "@/lib/academic";

const input = "rounded-xl border px-4 py-3";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { student, years } = await getStudent(id);
  const saveStudent = updateStudent.bind(null, id);
  const moveStudent = moveStudentEnrollment.bind(null, id);

  const activeEnrollment = student.enrollments.find((enrollment) => enrollment.status === "ACTIVE") || student.enrollments[0] || null;

  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-3xl font-bold">{student.displayName || student.name}</h1>
        <p className="mt-2 text-slate-600">Admission number {student.admissionNumber}</p>
        <Link
          className="mt-4 inline-block rounded-xl border border-blue-200 px-4 py-2 font-bold text-blue-700"
          href={`/school-dashboard/students/${student.id}/guardians`}
        >
          Manage parents / guardians
        </Link>
      </header>

      <form action={saveStudent} className="space-y-6 rounded-3xl border bg-white p-6 shadow-sm">
        <section>
          <h2 className="text-xl font-bold">Basic information</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="font-semibold">
              First name
              <input name="firstName" required defaultValue={student.firstName || ""} className={`mt-2 ${input}`} />
            </label>
            <label className="font-semibold">
              Last name
              <input name="lastName" required defaultValue={student.lastName || ""} className={`mt-2 ${input}`} />
            </label>
            <label className="font-semibold">
              Display name
              <input name="displayName" defaultValue={student.displayName || ""} className={`mt-2 ${input}`} />
            </label>
            <label className="font-semibold">
              Email (optional)
              <input name="email" type="email" defaultValue={student.email || ""} className={`mt-2 ${input}`} />
            </label>
            <label className="font-semibold">
              Student phone (optional)
              <input name="studentPhone" defaultValue={student.phone || ""} className={`mt-2 ${input}`} />
            </label>
            <label className="font-semibold">
              Date of birth
              <input
                name="dateOfBirth"
                type="date"
                defaultValue={student.dateOfBirth?.toISOString().slice(0, 10) || ""}
                className={`mt-2 ${input}`}
              />
            </label>
            <label className="font-semibold">
              Gender (optional)
              <input name="gender" defaultValue={student.gender || ""} className={`mt-2 ${input}`} />
            </label>
            <label className="font-semibold">
              Join date
              <input
                name="joinDate"
                type="date"
                defaultValue={student.joinDate?.toISOString().slice(0, 10) || ""}
                className={`mt-2 ${input}`}
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold">Guardian information</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="font-semibold">
              Guardian name (optional)
              <input name="guardianName" defaultValue={student.guardianName || ""} className={`mt-2 ${input}`} />
            </label>
            <label className="font-semibold">
              Guardian phone
              <input name="guardianPhone" defaultValue={student.guardianPhone || ""} className={`mt-2 ${input}`} />
            </label>
          </div>
        </section>

        <section>
          <label className="flex items-center gap-3 font-semibold">
            <input name="active" type="checkbox" defaultChecked={student.active} />
            Student is active
          </label>
        </section>

        <button className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Save student details</button>
      </form>

      <section id="login-readiness">
        <ActivationCodeIssuer
          studentId={student.id}
          eligible={student.active && !student.userId && Boolean(student.email)}
        />
      </section>

      <section id="move-student" className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Move student</h2>
        <p className="mt-2 text-slate-600">
          This creates a new active enrollment and preserves previous records.
        </p>
        <form action={moveStudent} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <select name="academicYearId" required defaultValue={activeEnrollment?.academicYearId || ""} className={input}>
            <option value="">Academic year</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
          <select name="schoolClassId" required defaultValue={activeEnrollment?.schoolClassId || ""} className={input}>
            <option value="">Class</option>
            {years.flatMap((year) =>
              year.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {year.name} - {item.name}
                </option>
              )),
            )}
          </select>
          <select name="sectionId" required defaultValue={activeEnrollment?.sectionId || ""} className={input}>
            <option value="">Section</option>
            {years.flatMap((year) =>
              year.classes.flatMap((item) =>
                item.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {year.name} - {item.name} - {section.name}
                  </option>
                )),
              ),
            )}
          </select>
          <input name="rollNumber" defaultValue={activeEnrollment?.rollNumber || ""} placeholder="Roll number" className={input} />
          <input
            name="movedOn"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={input}
          />
          <button className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white xl:col-span-5">
            Move student
          </button>
        </form>

        <div className="mt-7 space-y-3">
          {student.enrollments.map((enrollment) => (
            <div key={enrollment.id} className="rounded-2xl bg-slate-50 p-4">
              <strong>
                {enrollment.academicYear.name}: {enrollment.schoolClass.name} - {enrollment.section.name}
              </strong>
              <p className="mt-1 text-sm text-slate-500">
                {enrollment.rollNumber ? `Roll ${enrollment.rollNumber} - ` : ""}
                {enrollment.status.toLowerCase()} - joined {enrollment.joinedAt.toLocaleDateString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
