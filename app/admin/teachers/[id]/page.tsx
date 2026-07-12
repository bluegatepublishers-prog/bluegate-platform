import Link from "next/link";

import { requireUser } from "@/lib/authz";
import { getTeacherById } from "@/lib/teachers";
import TeacherActions from "@/components/admin/teachers/TeacherActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Teacher Details | Bluegate Admin",
};

export default async function TeacherDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  if (!process.env.DATABASE_URL) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">Database configuration required</h1>
          <p className="mt-4 text-slate-700">
            Teacher details cannot load because the database is not configured.
            Check the <code>DATABASE_URL</code> environment variable and try again.
          </p>
        </div>
      </div>
    );
  }

  await requireUser(["ADMIN"]);

  let teacher = null;
  let errorMessage: string | null = null;

  try {
    teacher = await getTeacherById(params.id);
  } catch (error) {
    console.error("Admin teacher detail error:", error);
    errorMessage =
      "Database connection is unavailable. Check the DATABASE_URL environment variable.";
  }

  if (errorMessage) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">Unable to load teacher details</h1>
          <p className="mt-4 text-slate-700">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
          <h1 className="text-3xl font-bold">Teacher Not Found</h1>
          <p className="mt-4 text-slate-700">
            The teacher record you requested does not exist or may have been removed.
          </p>
          <Link
            href="/admin/teachers"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Back to Teachers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Teacher Details</h1>
          <p className="mt-2 text-slate-600">
            Review the teacher's profile and verification status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/teachers"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Back to Teachers
          </Link>

          <TeacherActions
            teacherId={teacher.id}
            verified={teacher.verified}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
              <p className="mt-1 text-sm text-slate-500">User and teacher information.</p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                teacher.verified
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {teacher.verified ? "Verified" : "Pending"}
            </span>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Name</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{teacher.user.name}</p>
            </div>

            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Email</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{teacher.user.email}</p>
            </div>

            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Phone</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{teacher.user.phone ?? "—"}</p>
            </div>

            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Role</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{teacher.user.role}</p>
            </div>

            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">School</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{teacher.schoolName}</p>
            </div>

            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Designation</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{teacher.designation}</p>
            </div>

            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Subject</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{teacher.subject}</p>
            </div>

            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Classes</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{teacher.classes}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Audit</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-700">
            <div>
              <p className="text-slate-500">Registration date</p>
              <p className="mt-1 font-semibold text-slate-900">
                {new Date(teacher.user.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Last updated</p>
              <p className="mt-1 font-semibold text-slate-900">
                {new Date(teacher.user.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
