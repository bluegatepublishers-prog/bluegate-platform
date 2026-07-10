import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { ArrowRight, MapPin, Mail, User, Smartphone } from "lucide-react";

import { getSchoolById } from "@/lib/schools";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "School Details | Bluegate Admin",
};

interface SchoolDetailPageProps {
  params: {
    id: string;
  };
}

export default async function AdminSchoolDetailPage({ params }: SchoolDetailPageProps) {
  if (!process.env.DATABASE_URL) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">Database configuration required</h1>
          <p className="mt-4 text-slate-700">
            School details cannot load because the database is not configured.
            Check the <code>DATABASE_URL</code> environment variable and try again.
          </p>
        </div>
      </div>
    );
  }

  await requireUser(["ADMIN"]);

  let school = null;
  let errorMessage: string | null = null;

  try {
    school = await getSchoolById(params.id);
  } catch (error) {
    console.error("Admin school detail error:", error);
    errorMessage =
      "Database connection is unavailable. Check the DATABASE_URL environment variable.";
  }

  if (errorMessage) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">Unable to load school details</h1>
          <p className="mt-4 text-slate-700">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
          <h1 className="text-3xl font-bold">School Not Found</h1>
          <p className="mt-4 text-slate-700">
            The school record you requested does not exist or may have been removed.
          </p>
          <Link
            href="/admin/schools"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Back to Schools
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
            Admin / Schools
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{school.schoolName}</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            School details and associated account information.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">City</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{school.city}</p>
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">State</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{school.state}</p>
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Contact</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {school.user?.phone ?? "—"}
            </p>
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Registered user</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {school.user?.name ?? "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                School profile
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Overview</h2>
            </div>
            <ArrowRight className="h-6 w-6 text-slate-400" />
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">School name</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{school.schoolName}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">City</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{school.city}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">State</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{school.state}</p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Account</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">User details</h2>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3 rounded-3xl bg-slate-50 p-4">
                <User className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="font-medium text-slate-900">{school.user?.name ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-3xl bg-slate-50 p-4">
                <Mail className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">{school.user?.email ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-3xl bg-slate-50 p-4">
                <Smartphone className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-medium text-slate-900">{school.user?.phone ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-3xl bg-slate-50 p-4">
                <MapPin className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Location</p>
                  <p className="font-medium text-slate-900">{school.city}, {school.state}</p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
