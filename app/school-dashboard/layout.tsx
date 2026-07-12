import type { ReactNode } from "react";
import SchoolHeader from "@/components/school/SchoolHeader";
import SchoolNavigation from "@/components/school/SchoolNavigation";
import { requireSchool } from "@/lib/school-dashboard";
import { requireUser } from "@/lib/authz";
export const dynamic="force-dynamic";
export default async function SchoolLayout({children}:{children:ReactNode}) { if(!process.env.DATABASE_URL){await requireUser(["SCHOOL"]);return <div className="min-h-screen bg-slate-100 p-8"><div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 p-8"><h1 className="text-3xl font-bold">Database configuration required</h1><p className="mt-3 text-slate-700">The School Dashboard cannot load until the database connection is configured.</p></div></div>} const school=await requireSchool(); return <div className="flex min-h-screen bg-slate-100"><SchoolNavigation schoolName={school.schoolName} logoUrl={school.logoUrl}/><div className="min-w-0 flex-1"><SchoolHeader name={school.user.name}/><SchoolNavigation mobile schoolName={school.schoolName} logoUrl={school.logoUrl}/>{children}</div></div>; }
