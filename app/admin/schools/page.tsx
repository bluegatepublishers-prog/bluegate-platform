import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
import { getSchoolCities, getSchools } from "@/lib/schools";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Schools | Bluegate Admin" };

type View = "pending" | "active" | "suspended" | "expired" | "all";

export default async function AdminSchoolListPage({ searchParams }: { searchParams: Promise<{ query?: string; city?: string; plan?: string; accessStatus?: string; view?: string }> }) {
  const filters = await searchParams;
  const view: View = ["pending", "active", "suspended", "expired", "all"].includes(filters.view ?? "") ? filters.view as View : "all";
  const plan = filters.plan === "FREE" || filters.plan === "PAID" ? filters.plan : undefined;
  const accessStatus = ["ACTIVE", "SUSPENDED", "EXPIRED"].includes(filters.accessStatus ?? "") ? filters.accessStatus as "ACTIVE" | "SUSPENDED" | "EXPIRED" : undefined;
  const [cities, schools] = await Promise.all([getSchoolCities(), getSchools({ query: filters.query, city: filters.city, plan, accessStatus, view })]);

  return <main className="min-w-0 space-y-6">
    <header><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Publisher customers</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Schools</h1><p className="mt-2 max-w-3xl text-slate-600">Approve schools, set Free or Paid access, and assign publisher Books and Resources. School operations remain in the School Dashboard.</p></header>
    <nav aria-label="School status" className="flex gap-2 overflow-x-auto">{(["pending", "active", "suspended", "expired", "all"] as const).map((item) => <Link key={item} href={`/admin/schools?view=${item}`} aria-current={view === item ? "page" : undefined} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold capitalize ${view === item ? "bg-blue-700 text-white" : "border bg-white text-slate-700"}`}>{item}</Link>)}</nav>
    <form className="grid min-w-0 gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_12rem_10rem_12rem_auto]">
      <input type="hidden" name="view" value={view}/>
      <label className="text-sm font-semibold text-slate-700">Search<span className="mt-2 flex items-center gap-2 rounded-xl border px-3"><Search className="h-4 w-4 shrink-0 text-slate-400"/><input name="query" defaultValue={filters.query} placeholder="School name, city, or state" className="min-w-0 flex-1 py-3 font-normal outline-none"/></span></label>
      <Filter label="City" name="city" value={filters.city}><option value="">All cities</option>{cities.map((city) => <option key={city}>{city}</option>)}</Filter>
      <Filter label="Plan" name="plan" value={plan}><option value="">Free and Paid</option><option value="FREE">Free</option><option value="PAID">Paid</option></Filter>
      <Filter label="Access status" name="accessStatus" value={accessStatus}><option value="">All access states</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="EXPIRED">Expired</option></Filter>
      <button className="min-h-12 self-end rounded-xl bg-slate-900 px-5 font-semibold text-white">Apply</button>
    </form>
    <section className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_7rem_7rem_6rem_6rem_7rem_3rem] gap-3 border-b bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid"><span>School</span><span>City</span><span>Approval</span><span>Plan</span><span>Books</span><span>Resources</span><span>Updated</span><span/></div>
      <ul className="divide-y">{schools.map((school) => {
        const subscription = school.accessSubscription ?? { plan: "FREE" as const, status: "SUSPENDED" as const, startsAt: null, expiresAt: null, updatedAt: null };
        const effectiveStatus = effectiveSchoolAccessStatus(subscription);
        return <li key={school.id}><Link href={`/admin/schools/${school.id}`} className="grid min-w-0 gap-3 p-4 transition hover:bg-slate-50 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_7rem_7rem_6rem_6rem_7rem_3rem] lg:items-center">
          <span className="min-w-0"><strong className="block break-words text-slate-900">{school.schoolName}</strong><span className="block break-all text-sm text-slate-500">{school.user.email}</span></span>
          <Cell label="City" value={`${school.city}, ${school.state}`}/><Badge label="Approval" value={school.status}/><Badge label="Plan" value={subscription.plan}/><Cell label="Books" value={String(school._count.bookEntitlements)}/><Cell label="Resources" value={String(school._count.resourceEntitlements)}/><Cell label="Access" value={effectiveStatus === "NOT_STARTED" ? "Not started" : effectiveStatus}/><ChevronRight className="hidden h-5 w-5 text-slate-400 lg:block" aria-hidden/>
          {subscription.updatedAt ? <span className="text-xs text-slate-500 lg:col-start-7 lg:row-start-2">Updated {subscription.updatedAt.toLocaleDateString("en-IN")}</span> : null}
        </Link></li>;
      })}{!schools.length ? <li className="p-10 text-center text-slate-500">No schools match these filters.</li> : null}</ul>
    </section>
  </main>;
}

function Filter({ label, name, value, children }: { label: string; name: string; value?: string; children: React.ReactNode }) { return <label className="text-sm font-semibold text-slate-700">{label}<select name={name} defaultValue={value ?? ""} className="mt-2 block min-h-12 w-full rounded-xl border px-3 font-normal">{children}</select></label>; }
function Cell({ label, value }: { label: string; value: string }) { return <span className="text-sm text-slate-700"><span className="font-semibold lg:hidden">{label}: </span>{value}</span>; }
function Badge({ label, value }: { label: string; value: string }) { return <span><span className="mr-2 font-semibold lg:hidden">{label}:</span><span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{value}</span></span>; }
