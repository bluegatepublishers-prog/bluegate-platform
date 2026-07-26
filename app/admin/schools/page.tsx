import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

import { getSchoolCities, getSchools } from "@/lib/schools";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Schools | Bluegate Admin" };

export default async function AdminSchoolListPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; city?: string; archived?: string }>;
}) {
  const filters = await searchParams;
  const [cities, schools] = await Promise.all([
    getSchoolCities(),
    getSchools({
      query: filters.query,
      city: filters.city,
      includeArchived: filters.archived === "true",
    }),
  ]);

  return (
    <main className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Publisher customers</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Schools</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Manage institution status and publisher content availability. School operations remain with each school.
        </p>
        </div>
        <Link href="/admin/schools/new" className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">Create school</Link>
      </header>

      <form className="flex min-w-0 flex-wrap items-end gap-3 rounded-2xl border bg-white p-4 shadow-sm">
        <label className="min-w-0 flex-1 basis-64 text-sm font-semibold text-slate-700">
          Search
          <span className="mt-2 flex min-w-0 items-center gap-2 rounded-xl border px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              name="query"
              defaultValue={filters.query}
              placeholder="School name, city, or state"
              className="min-w-0 flex-1 py-3 font-normal outline-none"
            />
          </span>
        </label>
        <label className="min-w-48 text-sm font-semibold text-slate-700">
          City
          <select name="city" defaultValue={filters.city ?? ""} className="mt-2 block w-full rounded-xl border px-3 py-3 font-normal">
            <option value="">All cities</option>
            {cities.map((city) => <option key={city}>{city}</option>)}
          </select>
        </label>
        <label className="flex min-h-12 items-center gap-2 rounded-xl border px-4 text-sm font-semibold">
          <input type="checkbox" name="archived" value="true" defaultChecked={filters.archived === "true"} />
          Include archived
        </label>
        <button className="min-h-12 rounded-xl bg-slate-900 px-5 font-semibold text-white">Apply filters</button>
      </form>

      <section className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_9rem_8rem_8rem_3rem] gap-3 border-b bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
          <span>School</span><span>City</span><span>Status</span><span>Teachers</span><span>Students</span><span />
        </div>
        <ul className="divide-y">
          {schools.map((school) => (
            <li key={school.id}>
              <Link
                href={`/admin/schools/${school.id}`}
                className="grid min-w-0 gap-3 p-4 transition hover:bg-slate-50 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_9rem_8rem_8rem_3rem] md:items-center"
              >
                <span className="min-w-0">
                  <span className="block break-words font-bold text-slate-900">{school.schoolName}</span>
                  <span className="block break-all text-sm text-slate-500">{school.user.email}</span>
                </span>
                <span className="text-sm text-slate-700"><span className="font-semibold md:hidden">City: </span>{school.city}, {school.state}</span>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{school.status}</span>
                <span className="text-sm text-slate-700"><span className="font-semibold md:hidden">Teachers: </span>{school._count.staffMemberships}</span>
                <span className="text-sm text-slate-700"><span className="font-semibold md:hidden">Active students: </span>{school._count.studentEnrollments}</span>
                <ChevronRight className="hidden h-5 w-5 text-slate-400 md:block" aria-hidden />
              </Link>
            </li>
          ))}
          {!schools.length ? <li className="p-10 text-center text-slate-500">No schools match these filters.</li> : null}
        </ul>
      </section>
    </main>
  );
}
