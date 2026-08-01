import type { ReactNode } from "react";
import SchoolHeader from "@/components/school/SchoolHeader";
import SchoolNavigation from "@/components/school/SchoolNavigation";
import { requireSchool, SchoolDashboardAccessError } from "@/lib/school-dashboard";
import { requireUser } from "@/lib/authz";
import { getBrandingForAuthenticatedUser } from "@/lib/publisher-context";
import { resolveFeaturesForAuthenticatedUser } from "@/lib/publisher-features";
import { schoolLogoPath } from "@/lib/storage/media-path";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function SchoolLayout({ children }: { children: ReactNode }) {
  if (!process.env.DATABASE_URL) { await requireUser(["SCHOOL"]); return <div className="min-h-screen bg-slate-100 p-8">Database configuration required</div>; }
  let school;
  try { school = await requireSchool(); } catch (error) { if (error instanceof SchoolDashboardAccessError) return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-2xl font-bold text-amber-950">School access unavailable</h1><p className="mt-3 text-amber-800">{error.message}</p></section></main>; throw error; }
  const [branding, features, year] = await Promise.all([getBrandingForAuthenticatedUser(), resolveFeaturesForAuthenticatedUser(), prisma.academicYear.findFirst({ where: { schoolId: school.id, current: true, active: true }, select: { name: true } })]);
  const logoUrl = schoolLogoPath(school.logoUrl);
  return <div className="flex min-h-screen bg-[#f8fafc]"><SchoolNavigation schoolName={school.schoolName} logoUrl={logoUrl} branding={branding} features={features}/><div className="min-w-0 flex-1"><SchoolHeader name={school.user.name} schoolName={school.schoolName} academicYear={year?.name}/><SchoolNavigation mobile schoolName={school.schoolName} logoUrl={logoUrl} branding={branding} features={features}/>{children}</div></div>;
}
