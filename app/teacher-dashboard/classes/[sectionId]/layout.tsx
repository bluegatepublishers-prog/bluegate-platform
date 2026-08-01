import type { ReactNode } from "react";
import Link from "next/link";
import { PlatformFeatureKey } from "@prisma/client";
import ClassTabs from "@/components/classroom/ClassTabs";
import { requireTeacherClass } from "@/lib/classroom";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";

export default async function TeacherClassLayout({ children, params }: { children: ReactNode; params: Promise<{ sectionId: string }> }) { const { sectionId } = await params; const scope = await requireTeacherClass(sectionId); const assignmentsEnabled = await isPublisherFeatureEnabled(scope.publisherId, PlatformFeatureKey.ASSIGNMENTS); return <main className="space-y-6 p-4 sm:p-6 lg:p-8"><header className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><Link href="/teacher-dashboard/classes" className="text-sm font-bold text-blue-700">← Back to My Classes</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-blue-700">{scope.academicYear.name}</p><h1 className="mt-1 break-words text-2xl font-bold sm:text-3xl">{scope.schoolClass.name}-{scope.section.name}</h1><p className="mt-2 text-slate-600">{scope.isClassTeacher ? "Class Teacher" : "Subject Teacher"} · {scope.sectionSubjects.map((item) => item.subject.name).join(", ")}</p></div><span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">Active Class</span></div></header><ClassTabs sectionId={sectionId} assignmentsEnabled={assignmentsEnabled} />{children}</main>; }
