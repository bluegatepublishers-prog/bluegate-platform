import Link from "next/link";
import { getParentChildPortalData, getParentChildren } from "@/lib/parent-dashboard";
import { getParentChildAttendanceExperience } from "@/lib/attendance";

function formatDate(value?: Date | null) {
	return value ? value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not scheduled";
}

function learningTone(label: string) {
	if (label === "Excellent") return "bg-emerald-50 text-emerald-700";
	if (label === "On Track") return "bg-blue-50 text-blue-700";
	if (label === "Needs Practice") return "bg-amber-50 text-amber-700";
	if (label === "Needs Support") return "bg-rose-50 text-rose-700";
	return "bg-slate-100 text-slate-600";
}

function statusLabel(value: number) {
	if (value <= 0) return "Not Started";
	if (value >= 85) return "Excellent";
	if (value >= 70) return "On Track";
	if (value >= 50) return "Needs Practice";
	return "Needs Support";
}

export default async function ParentDashboardPage({
	searchParams,
}: {
	searchParams: Promise<{ studentId?: string | string[] }>;
}) {
	const { studentId } = await searchParams;
	const requestedStudentId = typeof studentId === "string" ? studentId : undefined;
	const { children } = await getParentChildren();
	const selectedChild = children.find((child) => child.student.id === requestedStudentId) ?? children[0] ?? null;

	if (!selectedChild) {
		return <main className="space-y-6"><section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"><h2 className="text-2xl font-bold text-slate-950">No approved children yet</h2><p className="mt-3 text-slate-600">If you recently activated an invitation, the school may still need to approve the relationship.</p></section></main>;
	}

	const data = await getParentChildPortalData(selectedChild.student.id);
	const attendance = await getParentChildAttendanceExperience({ studentId: selectedChild.student.id });
	const childOptions = children.map((child) => ({ id: child.student.id, label: `${child.student.name} · ${child.enrollment.schoolClass.name} ${child.enrollment.section.name}` }));

	return (
		<main className="space-y-6">
			<section className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100">Parent home</p>
						<h2 className="mt-2 text-3xl font-bold sm:text-4xl">How is my child doing?</h2>
						<p className="mt-3 max-w-2xl text-blue-50/90">A simple, read-only view of school-approved progress, upcoming work, notices and planning for {selectedChild.student.name}.</p>
					</div>
					{children.length > 1 ? (
						<form className="rounded-3xl bg-white/10 p-3 backdrop-blur" method="get">
							<label className="block text-sm font-semibold text-blue-50">Switch child</label>
							<select name="studentId" defaultValue={selectedChild.student.id} className="mt-2 min-w-72 rounded-2xl border border-white/20 bg-white/95 px-4 py-3 text-slate-950 shadow-sm outline-none">
								{childOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
							</select>
							<button className="mt-3 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-blue-700">Open child view</button>
						</form>
					) : null}
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
				<MetricCard
					title="Attendance"
					value={attendance.empty ? "Not available yet" : `${attendance.summary.percentage.toFixed(1)}%`}
					detail={attendance.empty ? "Attendance is not available yet." : `Today: ${attendance.today.label} · Present ${attendance.summary.present} · Absent ${attendance.summary.absent}`}
					tone={attendance.empty ? "slate" : "blue"}
					href={`/parent-dashboard/children/${selectedChild.student.id}/attendance`}
					actionLabel="View Attendance"
				/>
				<MetricCard title="Assignments Due" value={String(data.upcomingAssignments.length)} detail={data.upcomingAssignments[0]?.title ?? "No assignments due"} tone="blue" />
				<MetricCard title="Upcoming Assessments" value={String(data.upcomingAssessments.length)} detail={data.upcomingAssessments[0]?.title ?? "No upcoming assessments"} tone="amber" />
				<MetricCard title="Latest Published Result" value={data.latestPublishedResult?.score == null ? "Published" : `${Math.round(data.latestPublishedResult.score)}%`} detail={data.latestPublishedResult?.title ?? "No published result yet"} tone="emerald" />
				<MetricCard title="Overall Learning Status" value={data.overallStatus} detail={data.subjects[0]?.subject.name ?? "Based on school-approved learning data"} tone="violet" />
			</section>

			<section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,.95fr)]">
				<div className="space-y-6">
					<Card title="Child Summary">
						<div className="grid gap-4 sm:grid-cols-2">
							<KeyValue label="Child" value={selectedChild.student.name} />
							<KeyValue label="Class and section" value={`${selectedChild.enrollment.schoolClass.name} ${selectedChild.enrollment.section.name}`} />
							<KeyValue label="School" value={selectedChild.student.school.schoolName} />
							<KeyValue label="Class teacher" value={data.classTeacher ?? "Not assigned yet"} />
							<KeyValue label="Academic year" value={selectedChild.enrollment.academicYear.name} />
							<KeyValue label="Relationship" value={selectedChild.relationship.relationshipType.toLowerCase()} />
						</div>
					</Card>

					<Card title="Learning Progress">
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{data.subjects.slice(0, 6).map((subject) => <div key={subject.subjectId} className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">{subject.subject.name}</p><strong className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm ${learningTone(statusLabel(subject.completionPercent))}`}>{statusLabel(subject.completionPercent)}</strong><p className="mt-3 text-sm text-slate-600">Chapter progress: {subject.completionPercent > 0 ? "Available in learning view" : "No progress recorded yet"}</p></div>)}
						</div>
					</Card>

					<Card title="Assignments & Tests">
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<h3 className="font-semibold text-slate-950">Upcoming assignments</h3>
								<div className="mt-3 space-y-3">
									{data.upcomingAssignments.length ? data.upcomingAssignments.map((assignment) => <article key={assignment.id} className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-semibold text-blue-700">{assignment.subject ?? "Assignment"}</p><h4 className="mt-1 font-bold text-slate-950">{assignment.title}</h4><p className="mt-1 text-sm text-slate-600">Due {formatDate(assignment.dueAt)} · {assignment.status.toLowerCase()}</p><p className="mt-1 text-sm text-slate-600">{assignment.isLate ? "Late submission" : "On time or not yet submitted"}</p></article>) : <p className="text-sm text-slate-500">No assignments due.</p>}
								</div>
							</div>
							<div>
								<h3 className="font-semibold text-slate-950">Upcoming assessments</h3>
								<div className="mt-3 space-y-3">
									{data.upcomingAssessments.length ? data.upcomingAssessments.map((assessment) => <article key={assessment.id} className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-semibold text-amber-700">{assessment.subject ?? "Assessment"}</p><h4 className="mt-1 font-bold text-slate-950">{assessment.title}</h4><p className="mt-1 text-sm text-slate-600">{assessment.released ? `Published result ${assessment.score == null ? "available" : `${Math.round(assessment.score)}%`}` : `Opens ${formatDate(assessment.opensAt)}`}</p></article>) : <p className="text-sm text-slate-500">No upcoming assessments.</p>}
								</div>
							</div>
						</div>
					</Card>

					<Card title="Teacher Remarks">
						{data.latestFeedback ? <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold text-blue-700">{data.latestFeedback.title}</p><p className="mt-1 text-sm text-slate-600">{data.latestFeedback.subject ?? "Released feedback"}</p><p className="mt-3 text-slate-700">{data.latestFeedback.feedback}</p></div> : <p className="text-sm text-slate-500">No released teacher remarks are available yet.</p>}
					</Card>

					<Card title="Learning Support">
						{data.gaps.length ? <div className="space-y-3">{data.gaps.slice(0, 4).map((gap) => <div key={gap.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{gap.message}</div>)}</div> : <p className="text-sm text-slate-500">No learning support items are available right now.</p>}
					</Card>
				</div>

				<div className="space-y-6">
					<Card title="Latest Notice">
						{data.latestNotice ? <article className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold text-blue-700">{data.latestNotice.type}</p><h3 className="mt-1 font-bold text-slate-950">{data.latestNotice.title}</h3><p className="mt-2 text-sm text-slate-600">{data.latestNotice.description ?? "Notice published by the school."}</p><p className="mt-2 text-xs uppercase tracking-wide text-slate-500">{formatDate(data.latestNotice.date)}</p></article> : <p className="text-sm text-slate-500">No applicable notices yet.</p>}
					</Card>

					<Card title="Planner Preview">
						{data.plannerItems.length ? <div className="space-y-3">{data.plannerItems.slice(0, 5).map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-950">{item.title}</p><span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">{item.type.toLowerCase()}</span></div><p className="mt-1 text-sm text-slate-600">{formatDate(item.date)}</p></article>)}</div> : <p className="text-sm text-slate-500">No planner items in the selected window.</p>}
					</Card>

					<Card title="Recent Published Results">
						{data.latestPublishedResult ? <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold text-emerald-700">{data.latestPublishedResult.title}</p><p className="mt-1 text-sm text-slate-600">Marks: {data.latestPublishedResult.score == null ? "Not shared" : `${Math.round(data.latestPublishedResult.score)}%`}</p><p className="mt-2 text-sm text-slate-700">{data.latestPublishedResult.subjectivePending ? "Subjective review is still pending." : "Result has been released to parents."}</p></div> : <p className="text-sm text-slate-500">No released result remarks yet.</p>}
					</Card>
				</div>
			</section>
		</main>
	);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
	return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold text-slate-950">{title}</h3><div className="mt-5">{children}</div></section>;
}

function MetricCard({ title, value, detail, tone, href, actionLabel }: { title: string; value: string; detail: string; tone: "slate" | "blue" | "amber" | "emerald" | "violet"; href?: string; actionLabel?: string }) {
	const styles = {
		slate: "bg-slate-50 text-slate-700",
		blue: "bg-blue-50 text-blue-700",
		amber: "bg-amber-50 text-amber-700",
		emerald: "bg-emerald-50 text-emerald-700",
		violet: "bg-violet-50 text-violet-700",
	};
	return <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{title}</p><strong className="mt-3 block text-2xl text-slate-950">{value}</strong><p className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${styles[tone]}`}>{detail}</p>{href && actionLabel ? <div className="mt-3"><Link href={href} className="text-sm font-semibold text-blue-700">{actionLabel}</Link></div> : null}</article>;
}

function KeyValue({ label, value }: { label: string; value: string }) {
	return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-950">{value}</p></div>;
}
