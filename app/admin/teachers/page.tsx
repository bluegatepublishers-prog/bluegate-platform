import Link from "next/link";
import { Users, Search, X } from "lucide-react";

import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { getTeacherSubjects, getTeachers, TeacherWithUser } from "@/lib/teachers";
import TeacherActions from "@/components/admin/teachers/TeacherActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Teachers | Bluegate Admin",
};

type TeachersSearchParams = {
  query?: string;
  status?: string;
  subject?: string;
};

function statusLabel(status: string | undefined) {
  switch (status) {
    case "verified":
      return "Verified";
    case "pending":
      return "Pending";
    default:
      return "All teachers";
  }
}

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: TeachersSearchParams;
}) {
  if (!process.env.DATABASE_URL) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">Database configuration required</h1>
          <p className="mt-4 text-slate-700">
            The teacher management page cannot load because the database is not configured.
            Check the <code>DATABASE_URL</code> environment variable and try again.
          </p>
        </div>
      </div>
    );
  }

  await requireLivePublisherAdmin();

  let teachers: TeacherWithUser[] = [];
  let subjects: string[] = [];
  let errorMessage: string | null = null;

  const statusFilter =
    searchParams.status === "verified" ||
    searchParams.status === "pending"
      ? (searchParams.status as "verified" | "pending")
      : undefined;

  const subjectFilter = searchParams.subject?.trim() || undefined;
  const queryFilter = searchParams.query?.trim() || undefined;

  try {
    subjects = await getTeacherSubjects();
    teachers = await getTeachers({
      query: queryFilter,
      status: statusFilter,
      subject: subjectFilter,
    });
  } catch (error) {
    console.error("Admin teachers list error:", error);
    errorMessage =
      "Database connection is unavailable. Check the DATABASE_URL environment variable.";
  }

  const hasFilters = Boolean(
    queryFilter || statusFilter || subjectFilter
  );

  if (errorMessage) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">Unable to load teachers</h1>
          <p className="mt-4 text-slate-700">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Teacher Management</span>
          </div>

          <h1 className="mt-3 text-3xl font-bold text-slate-900">Teachers</h1>
          <p className="mt-2 text-slate-600">
            Manage registered teachers, verify accounts, and review school details.
          </p>
        </div>

      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Showing</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {teachers.length} {teachers.length === 1 ? "teacher" : "teachers"}
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            {hasFilters
              ? `Filter: ${statusLabel(statusFilter)}${subjectFilter ? ` · ${subjectFilter}` : ""}`
              : "All registered teachers."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <Search className="h-5 w-5 text-slate-400" />
            Teacher search and filters
          </div>
          <form className="mt-5 space-y-4" method="get">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>
              <input
                name="query"
                defaultValue={searchParams.query ?? ""}
                placeholder="Name, email, school or subject"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Status
                <select
                  name="status"
                  defaultValue={searchParams.status ?? ""}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
                >
                  <option value="">All teachers</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending verification</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Subject
                <select
                  name="subject"
                  defaultValue={searchParams.subject ?? ""}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
                >
                  <option value="">All subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Search
              </button>

              {hasFilters && (
                <Link
                  href="/admin/teachers"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reset filters
                </Link>
              )}
            </div>
          </form>
        </div>
      </div>

      {teachers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
          <Users className="mx-auto h-12 w-12 text-blue-500" />
          <h2 className="mt-6 text-2xl font-semibold text-slate-900">No teachers found</h2>
          <p className="mt-3 text-sm text-slate-500">
            {hasFilters
              ? "No teachers match your current search or filters."
              : "There are no registered teachers yet."}
          </p>
          {hasFilters ? (
            <Link
              href="/admin/teachers"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Reset filters
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">School</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Designation</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Subject</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Classes</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Registered</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-5">
                      <div className="font-semibold text-slate-900">{teacher.user.name}</div>
                      <div className="text-sm text-slate-500">{teacher.user.role}</div>
                    </td>
                    <td className="px-6 py-5 text-slate-700">{teacher.user.email}</td>
                    <td className="px-6 py-5 text-slate-700">{teacher.schoolName}</td>
                    <td className="px-6 py-5 text-slate-700">{teacher.user.phone ?? "—"}</td>
                    <td className="px-6 py-5 text-slate-700">{teacher.designation}</td>
                    <td className="px-6 py-5 text-slate-700">{teacher.subject}</td>
                    <td className="px-6 py-5 text-slate-700">{teacher.classes || "—"}</td>
                    <td className="px-6 py-5">
                      {teacher.verified ? (
                        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-slate-700">
                      {new Date(teacher.user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <TeacherActions
                        teacherId={teacher.id}
                        verified={teacher.verified}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
