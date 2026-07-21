import { SchoolStaffRole } from "@prisma/client";
import { getSchoolStaff } from "@/lib/school-dashboard";
import { addSchoolStaffMembership, updateSchoolStaffMembership } from "../school-actions";

export const dynamic = "force-dynamic";

const input = "w-full rounded-xl border px-4 py-3";

export default async function SchoolStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; role?: string; active?: "active" | "inactive" }>;
}) {
  const params = await searchParams;
  const { memberships } = await getSchoolStaff({
    query: params.query,
    role: params.role,
    active: params.active,
  });

  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-3xl font-bold">Staff</h1>
        <p className="mt-2 text-slate-600">Manage school or institution staff memberships using existing accounts.</p>
      </header>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Add existing account</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create the user account first, then add the person to your institution.
        </p>
        <form action={addSchoolStaffMembership} className="mt-4 grid gap-4 md:grid-cols-3">
          <input name="identifier" required placeholder="User email or ID" className={input} />
          <select name="role" required className={input} defaultValue={SchoolStaffRole.TEACHER}>
            {Object.values(SchoolStaffRole).map((role) => (
              <option key={role} value={role}>
                {friendlyRole(role)}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Add staff membership</button>
        </form>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Filters</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-4">
          <input name="query" defaultValue={params.query || ""} placeholder="Search by name or email" className={input} />
          <select name="role" defaultValue={params.role || ""} className={input}>
            <option value="">All roles</option>
            {Object.values(SchoolStaffRole).map((role) => (
              <option key={role} value={role}>
                {friendlyRole(role)}
              </option>
            ))}
          </select>
          <select name="active" defaultValue={params.active || ""} className={input}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">Apply</button>
        </form>
      </section>

      <section>
        <p className="mb-3 text-sm font-semibold text-slate-600">{memberships.length} staff memberships found</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {memberships.map((membership) => (
            <article key={membership.id} className="rounded-3xl border bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">{membership.userName}</h3>
              <p className="mt-1 text-sm text-slate-500">{membership.userEmail}</p>
              <p className="mt-2 text-sm font-semibold">Role: {friendlyRole(membership.role)}</p>
              <p className="mt-1 text-sm text-slate-600">Status: {membership.active ? "Active" : "Inactive"}</p>
              <form action={updateSchoolStaffMembership} className="mt-4 space-y-3">
                <input type="hidden" name="membershipId" value={membership.id} />
                <select name="role" defaultValue={membership.role} className={input}>
                  {Object.values(SchoolStaffRole).map((role) => (
                    <option key={role} value={role}>
                      {friendlyRole(role)}
                    </option>
                  ))}
                </select>
                <input type="hidden" name="active" value={membership.active ? "false" : "true"} />
                <button className="w-full rounded-xl border px-4 py-2 font-semibold">
                  {membership.active ? "Deactivate membership" : "Activate membership"}
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function friendlyRole(role: SchoolStaffRole) {
  if (role === SchoolStaffRole.ADMINISTRATOR) return "Administrator";
  if (role === SchoolStaffRole.PRINCIPAL) return "Principal";
  if (role === SchoolStaffRole.COORDINATOR) return "Coordinator";
  if (role === SchoolStaffRole.TEACHER) return "Teacher";
  if (role === SchoolStaffRole.ACCOUNTANT) return "Accountant";
  return "Other";
}
