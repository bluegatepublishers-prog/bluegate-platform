import SchoolProfileForm from "@/components/school/SchoolProfileForm";
import { requireSchool } from "@/lib/school-dashboard";
import { getSchoolProfileCompleteness } from "@/lib/school-academic-management";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SchoolProfilePage() {
  const school = await requireSchool();
  const profile = {
    id: school.id,
    schoolName: school.schoolName,
    principalName: school.principalName ?? "",
    phone: school.user.phone ?? "",
    email: school.user.email,
    address: school.address ?? "",
    city: school.city,
    state: school.state,
    pincode: school.pincode ?? "",
    logoUrl: school.logoUrl ?? "",
  };
  const completeness = getSchoolProfileCompleteness(profile);

  return <main className="space-y-8 p-4 sm:p-6 lg:p-8"><header><h1 className="text-3xl font-bold">School / Institution Profile</h1><p className="mt-2 text-slate-600">Keep organization and contact details accurate.</p></header>
    <section className="grid gap-4 rounded-3xl border bg-white p-6 shadow-sm md:grid-cols-[1fr_auto]"><div><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Profile completeness</h2><span className="font-bold text-blue-700">{completeness.percent}%</span></div><div className="mt-3 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${completeness.percent}%` }}/></div><p className="mt-3 text-sm text-slate-600">{completeness.complete ? "All supported profile fields are complete." : `Still needed: ${completeness.missing.join(", ")}.`}</p></div><dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:min-w-72"><div><dt className="text-slate-500">Approval</dt><dd className="font-semibold">{school.status}</dd></div><div><dt className="text-slate-500">Account</dt><dd className="font-semibold">{school.user.active ? "Active" : "Inactive"}</dd></div><div className="col-span-2"><dt className="text-slate-500">Publisher</dt><dd className="font-semibold">{school.publisher.name}</dd></div></dl></section>
    <SchoolProfileForm profile={profile}/>
  </main>;
}
