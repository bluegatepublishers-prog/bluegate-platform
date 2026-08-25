import Link from "next/link";
import {
	archiveAssessmentAction,
	duplicateAssessmentAction,
	restoreAssessmentAction,
} from "./actions";
import { getTeacherAssessmentList, type TeacherAssessmentLifecycleStatus } from "@/lib/teacher-assessments";

type Card = Awaited<ReturnType<typeof getTeacherAssessmentList>>["items"][number];

const TITLES: Record<TeacherAssessmentLifecycleStatus, string> = {
	DRAFT: "Draft",
	SCHEDULED: "Scheduled",
	ACTIVE: "Active",
	CLOSED: "Closed",
	ARCHIVED: "Archived",
};

export default async function TeacherAssessmentsPage({
	params,
	searchParams,
}: {
	params: Promise<{ sectionId: string }>;
	searchParams: Promise<{ subject?: string }>;
}) {
	const { sectionId } = await params;
	const selected = (await searchParams).subject;
	const data = await getTeacherAssessmentList(sectionId, selected);

	return (
		<section className="space-y-6">
			<header className="rounded-3xl border bg-white p-6 shadow-sm">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-sm font-semibold text-violet-700">Assessment Builder</p>
						<h1 className="mt-1 text-2xl font-bold">{data.subject.subject.name} Assessments</h1>
						<p className="mt-2 text-sm text-slate-600">Draft, schedule, publish, duplicate, and archive assessments for this class.</p>
					</div>
					<div className="flex gap-2">
						<Link
							href={`/teacher-dashboard/ai/question-paper`}
							className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
						>
							AI Question Generator
						</Link>
						<Link
							href={`/teacher-dashboard/classes/${sectionId}/assessments/new?subject=${data.subject.id}`}
							className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white"
						>
							Create Assessment
						</Link>
					</div>
				</div>
			</header>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
				{Object.entries(data.groups).map(([key, value]) => (
					<article key={key} className="rounded-2xl border bg-white p-4 shadow-sm">
						<p className="text-sm font-semibold text-slate-600">{TITLES[key as TeacherAssessmentLifecycleStatus]}</p>
						<p className="mt-2 text-3xl font-bold">{value.length}</p>
					</article>
				))}
			</div>

			{(["DRAFT", "SCHEDULED", "ACTIVE", "CLOSED", "ARCHIVED"] as const).map((groupKey) => (
				<section key={groupKey} className="rounded-3xl border bg-white p-6 shadow-sm">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-bold">{TITLES[groupKey]}</h2>
						<span className="text-sm font-semibold text-slate-500">{data.groups[groupKey].length} assessment(s)</span>
					</div>
					{data.groups[groupKey].length ? (
						<div className="space-y-3">
							{data.groups[groupKey].map((item) => (
								<AssessmentCard
									key={item.id}
									sectionId={sectionId}
									subjectId={data.subject.id}
									item={item}
								/>
							))}
						</div>
					) : (
						<p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No assessments in this state.</p>
					)}
				</section>
			))}
		</section>
	);
}

function AssessmentCard({
	sectionId,
	subjectId,
	item,
}: {
	sectionId: string;
	subjectId: string;
	item: Card;
}) {
	return (
		<article className="rounded-2xl border border-slate-200 p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
					<p className="mt-1 text-sm text-slate-600">
						{item.subject} · {item.chapter}
					</p>
					<p className="mt-1 text-sm text-slate-500">
						{item.totalQuestions} question(s) · {item.totalMarks} marks · {item.attempts} attempt(s)
					</p>
					{item.needsGrading ? <p className="mt-2 text-sm font-bold text-amber-700">{item.needsGrading} response{item.needsGrading === 1 ? "" : "s"} need grading</p> : null}
				</div>
				<span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{item.lifecycle}</span>
			</div>

			<div className="mt-4 flex flex-wrap gap-2 text-sm">
				<Link
					href={item.needsGrading ? `/teacher-dashboard/classes/${sectionId}/assessments/${item.id}/grading` : `/teacher-dashboard/classes/${sectionId}/assessments/${item.id}?subject=${subjectId}`}
					className="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white"
				>
					{item.needsGrading ? "Review" : "Open"}
				</Link>
				<form action={duplicateAssessmentAction.bind(null, sectionId, item.id)}>
					<button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700">Duplicate</button>
				</form>
				{item.lifecycle === "ARCHIVED" ? (
					<form action={restoreAssessmentAction.bind(null, sectionId, item.id)}>
						<button type="submit" className="rounded-lg border border-emerald-300 px-3 py-2 font-semibold text-emerald-700">Restore</button>
					</form>
				) : (
					<form action={archiveAssessmentAction.bind(null, sectionId, item.id)}>
						<button type="submit" className="rounded-lg border border-amber-300 px-3 py-2 font-semibold text-amber-700">Archive</button>
					</form>
				)}
			</div>
		</article>
	);
}
