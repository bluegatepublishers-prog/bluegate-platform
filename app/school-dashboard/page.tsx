import Image from "next/image";
import Link from "next/link";
import {
	BookOpen,
	BookOpenCheck,
	CheckCircle2,
	Circle,
	GraduationCap,
	School,
	UserPlus,
	UserRoundCheck,
	Users,
} from "lucide-react";
import { getSchoolDashboard } from "@/lib/school-dashboard";
import { schoolLogoPath } from "@/lib/storage/media-path";
export const dynamic="force-dynamic";export const revalidate=0;
export default async function SchoolDashboardPage(){
	const { school, currentYear, stats, recentStudents, recentAssignments, checklist } = await getSchoolDashboard();
	const logoUrl = schoolLogoPath(school.logoUrl);
	const completed = checklist.filter((step) => step.complete).length;
	const progressPercent = Math.round((completed / Math.max(1, checklist.length)) * 100);
	return <main className="space-y-8 p-4 sm:p-6 lg:p-8">
		<section className="flex flex-col gap-6 rounded-3xl bg-gradient-to-br from-blue-700 to-slate-900 p-8 text-white shadow-xl sm:flex-row sm:items-center">{logoUrl?<Image src={logoUrl} alt="School logo" width={112} height={112} className="h-28 w-28 rounded-2xl bg-white object-contain p-2"/>:<div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white/15 text-3xl font-bold">{initials(school.schoolName)}</div>}<div><p className="font-semibold text-blue-100">School / Institution Dashboard</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{school.schoolName}</h1><p className="mt-3 text-blue-100">Current Academic Year: <strong>{currentYear?.name??"Not selected"}</strong></p></div></section>

		<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<Stat icon={Users} label="Total Active Staff" value={stats.staff}/>
			<Stat icon={GraduationCap} label="Total Active Students" value={stats.students}/>
			<Stat icon={School} label="Total Active Classes" value={stats.classes}/>
			<Stat icon={BookOpenCheck} label="Total Active Sections" value={stats.sections}/>
			<Stat icon={UserRoundCheck} label="Pending Class Teachers" value={stats.pendingClassTeachers} warning/>
			<Stat icon={UserRoundCheck} label="Pending Subject Teachers" value={stats.pendingSubjectTeachers} warning/>
			<Stat icon={BookOpen} label="Available Resources" value={stats.resources}/>
		</section>

		<section className="rounded-3xl border bg-white p-6 shadow-sm">
			<h2 className="text-2xl font-bold">Setup Checklist</h2>
			<p className="mt-2 text-slate-600">Complete these steps to finish your school or institution setup.</p>
			<div className="mt-4 rounded-2xl bg-slate-50 p-4">
				<div className="flex items-center justify-between gap-3">
					<p className="font-semibold text-slate-700">Setup progress</p>
					<p className="text-sm font-bold text-blue-700">{progressPercent}%</p>
				</div>
				<div className="mt-3 h-2 rounded-full bg-slate-200">
					<div className="h-2 rounded-full bg-blue-600" style={{ width: `${progressPercent}%` }} />
				</div>
			</div>
			<div className="mt-5 grid gap-3 md:grid-cols-2">
				{checklist.map((step) => <Link key={step.key} href={step.href} className="flex items-center justify-between rounded-2xl border px-4 py-3 hover:border-blue-300 hover:bg-blue-50"><div className="flex items-center gap-3">{step.complete?<CheckCircle2 className="h-5 w-5 text-green-600"/>:<Circle className="h-5 w-5 text-slate-400"/>}<span className="font-semibold text-slate-700">{step.label}</span></div><span className={`text-xs font-bold ${step.complete?"text-green-700":"text-amber-700"}`}>{step.complete?"Complete":"Pending"}</span></Link>)}
			</div>
			{checklist.some((step) => !step.complete) ? <div className="mt-5 flex flex-wrap gap-2">{checklist.filter((step) => !step.complete).slice(0, 3).map((step) => <Link key={`${step.key}-action`} href={step.href} className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">Complete: {step.label}</Link>)}</div> : null}
		</section>

		<section className="grid gap-6 xl:grid-cols-2">
			<div className="rounded-3xl border bg-white p-6 shadow-sm">
				<h2 className="text-2xl font-bold">Recent Students</h2>
				{recentStudents.length ? <ul className="mt-4 space-y-3">{recentStudents.map((student) => <li key={student.id} className="rounded-xl bg-slate-50 p-3"><p className="font-semibold">{student.name}</p><p className="text-sm text-slate-500">Admission {student.admissionNumber}</p></li>)}</ul> : <p className="mt-4 text-slate-500">No students have been added yet.</p>}
			</div>
			<div className="rounded-3xl border bg-white p-6 shadow-sm">
				<h2 className="text-2xl font-bold">Recent Teacher Assignments</h2>
				{recentAssignments.length ? <ul className="mt-4 space-y-3">{recentAssignments.map((assignment) => <li key={assignment.id} className="rounded-xl bg-slate-50 p-3"><p className="font-semibold">{assignment.teacher.user.name}</p><p className="text-sm text-slate-500">{assignment.schoolClass.name} - {assignment.section.name}{assignment.subject ? ` - ${assignment.subject.name}` : " - Class Teacher"}</p></li>)}</ul> : <p className="mt-4 text-slate-500">No assignments are active yet.</p>}
			</div>
		</section>

		<section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold">Quick Actions</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Action href="/school-dashboard/teachers" label="Add Teacher" icon={UserPlus}/><Action href="/school-dashboard/students" label="Add Student" icon={GraduationCap}/><Action href="/school-dashboard/classes" label="Manage Classes" icon={School}/><Action href="/school-dashboard/teacher-assignments" label="Assign Teachers" icon={UserRoundCheck}/><Action href="/school-dashboard/profile" label="School / Institution Profile" icon={School}/></div></section>
	</main>
}
function Stat({icon:Icon,label,value,warning=false}:{icon:typeof Users;label:string;value:number;warning?:boolean}){return <div className={`rounded-3xl border bg-white p-6 shadow-sm ${warning&&value>0?"border-amber-300":""}`}><Icon className={`h-9 w-9 ${warning&&value>0?"text-amber-600":"text-blue-700"}`}/><p className="mt-5 text-3xl font-bold">{value}</p><p className="mt-1 text-slate-600">{label}</p></div>}
function Action({href,label,icon:Icon}:{href:string;label:string;icon:typeof Users}){return <Link href={href} className="flex items-center gap-3 rounded-2xl border p-4 font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50"><Icon className="h-5 w-5 text-blue-700"/>{label}</Link>}
function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]?.toUpperCase()).join("")||"S"}
