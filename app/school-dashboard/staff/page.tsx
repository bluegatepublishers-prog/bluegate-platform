import { SchoolStaffRole } from "@prisma/client";
import { getSchoolStaff } from "@/lib/school-dashboard";
import { addSchoolStaffMembership, updateSchoolStaffMembership } from "../school-actions";

export const dynamic = "force-dynamic";
const input = "h-9 w-full rounded-lg border border-slate-300 px-3 text-sm";
const STAFF_ROLES = [SchoolStaffRole.ADMINISTRATOR, SchoolStaffRole.PRINCIPAL, SchoolStaffRole.COORDINATOR, SchoolStaffRole.TEACHER, SchoolStaffRole.OTHER] as const;

export default async function SchoolStaffPage({ searchParams }: { searchParams: Promise<{ query?: string; role?: string; active?: "active" | "inactive" }> }) {
  const params = await searchParams;
  const { memberships } = await getSchoolStaff({ query: params.query, role: params.role, active: params.active });
  return <main className="space-y-5 p-4 text-[15px] sm:p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">People</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Staff</h1><p className="mt-1 text-sm text-slate-600">Manage existing school memberships without creating duplicate accounts.</p></header>
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><form action={addSchoolStaffMembership} className="grid gap-2 md:grid-cols-4"><input name="identifier" required placeholder="User email or ID" className={input}/><select name="role" required className={input} defaultValue={SchoolStaffRole.OTHER}>{STAFF_ROLES.map((role) => <option key={role} value={role}>{friendlyRole(role)}</option>)}</select><button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">+ Add membership</button></form></section>
    <form className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><input name="query" defaultValue={params.query} placeholder="Search name or email" className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-sm"/><select name="role" defaultValue={params.role ?? ""} className="h-9 rounded-lg border border-slate-300 px-3 text-sm"><option value="">All roles</option>{STAFF_ROLES.map((role) => <option key={role} value={role}>{friendlyRole(role)}</option>)}</select><select name="active" defaultValue={params.active ?? ""} className="h-9 rounded-lg border border-slate-300 px-3 text-sm"><option value="">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button className="rounded-lg bg-slate-900 px-3 text-sm font-bold text-white">Filter</button></form>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{memberships.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Role</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{memberships.map((membership) => <tr key={membership.id}><td className="px-4 py-3 font-semibold">{membership.userName}</td><td className="px-4 py-3 text-slate-600">{membership.userEmail}</td><td className="px-4 py-3">{friendlyRole(membership.role)}</td><td className="px-4 py-3"><span className={"rounded-full px-2 py-1 text-xs font-bold " + (membership.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{membership.active ? "Active" : "Inactive"}</span></td><td className="px-4 py-3"><details><summary className="cursor-pointer font-bold text-blue-700">Edit</summary><form action={updateSchoolStaffMembership} className="mt-2 grid gap-2 rounded-lg border bg-slate-50 p-2"><input type="hidden" name="membershipId" value={membership.id}/><select name="role" defaultValue={membership.role} className={input}>{STAFF_ROLES.map((role) => <option key={role} value={role}>{friendlyRole(role)}</option>)}</select><input type="hidden" name="active" value={membership.active ? "false" : "true"}/><button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">{membership.active ? "Deactivate" : "Activate"}</button></form></details></td></tr>)}</tbody></table></div> : <p className="px-4 py-10 text-center text-sm text-slate-500">No staff memberships found.</p>}</section>
  </main>;
}

function friendlyRole(role: SchoolStaffRole) {
  if (role === SchoolStaffRole.ADMINISTRATOR) return "Administrator";
  if (role === SchoolStaffRole.PRINCIPAL) return "Principal";
  if (role === SchoolStaffRole.COORDINATOR) return "Coordinator";
  if (role === SchoolStaffRole.TEACHER) return "Teacher";
  if (role === SchoolStaffRole.ACCOUNTANT) return "Accountant";
  return "Other";
}
