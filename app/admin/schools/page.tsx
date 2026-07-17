import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { Search, MapPin, ChevronRight, Users } from "lucide-react";

import { getSchoolCities, getSchools, SchoolWithUser } from "@/lib/schools";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Schools | Bluegate Admin",
};

interface SchoolListPageProps {
  searchParams?: {
    query?: string;
    city?: string;
  };
}

export default async function AdminSchoolListPage({
  searchParams,
}: SchoolListPageProps) {
  if (!process.env.DATABASE_URL) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">Database configuration required</h1>
          <p className="mt-4 text-slate-700">
            The school management page cannot load because the database is not configured.
            Check the <code>DATABASE_URL</code> environment variable and try again.
          </p>
        </div>
      </div>
    );
  }

  await requireLivePublisherAdmin();

  let cities: string[] = [];
  let schools: SchoolWithUser[] = [];
  let errorMessage: string | null = null;

  try {
    cities = await getSchoolCities();
    schools = await getSchools({
      query: searchParams?.query,
      city: searchParams?.city,
    });
  } catch (error) {
    console.error("Admin schools list error:", error);
    errorMessage =
      "Database connection is unavailable. Check the DATABASE_URL environment variable.";
  }

  if (errorMessage) {
    return (
      <div className="space-y-8 p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h1 className="text-3xl font-bold">Unable to load schools</h1>
          <p className="mt-4 text-slate-700">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Schools</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Manage registered schools and review school details.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                Schools
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {schools.length}
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                Cities
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {cities.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,320px)_1fr]">
        <section className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900">Filter schools</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="query" className="block text-sm font-medium text-slate-700">
                Search
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  id="query"
                  name="query"
                  defaultValue={searchParams?.query}
                  placeholder="School, city, state, name or email"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-slate-700">
                City
              </label>
              <select
                id="city"
                name="city"
                defaultValue={searchParams?.city ?? ""}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
              >
                <option value="">All cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              form="school-filter"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Apply filters
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">School list</h2>
            <p className="mt-1 text-sm text-slate-600">
              View registered schools and inspect associated user accounts.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">School</th>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4">State</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id} className="border-t last:border-b">
                    <td className="px-6 py-5 text-sm font-semibold text-slate-900">
                      {school.schoolName}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-700">{school.city}</td>
                    <td className="px-6 py-5 text-sm text-slate-700">{school.state}</td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      {school.user?.name ?? "—"}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      {school.user?.email ?? "—"}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      <a
                        href={`/admin/schools/${school.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        View
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))}
                {schools.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                      No schools found with these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
