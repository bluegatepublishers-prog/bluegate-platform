import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getStudentSubject } from "@/lib/student-subjects";
import StudentAssessmentStart from "@/components/student/StudentAssessmentStart";
import {
  getStudentClassSubjectWorkspace,
  studentAssessmentState,
  studentAssignmentState,
} from "@/lib/student-class-subject-workspace";

const tabs = ["overview", "learn", "assignments", "assessments", "progress"] as const;
const assignmentFilters = ["ALL", "HOMEWORK", "CLASSWORK", "WORKSHEET", "PROJECT"] as const;

export default async function StudentSubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionSubjectId: string }>;
  searchParams: Promise<{ tab?: string; filter?: string }>;
}) {
  const { sectionSubjectId } = await params;
  const subject = await getStudentSubject(sectionSubjectId);
  if (!subject) notFound();
  const requested = await searchParams;
  const tab = tabs.includes(requested.tab as typeof tabs[number]) ? requested.tab as typeof tabs[number] : "overview";
  const filter = assignmentFilters.includes(requested.filter as typeof assignmentFilters[number])
    ? requested.filter as typeof assignmentFilters[number]
    : "ALL";
  const data = await getStudentClassSubjectWorkspace(sectionSubjectId);
  if (!data) notFound();

  const complete = data.chapters.filter((chapter) => chapter.studentRevisionProgress[0]?.revisionCompleted).length;
  const progress = data.chapters.length ? Math.round((complete / data.chapters.length) * 100) : 0;
  const visibleAssignments = filter === "ALL"
    ? data.assignments
    : data.assignments.filter((item) => item.assignmentType === filter);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <Link href="/student-dashboard/my-class" className="text-sm font-semibold text-blue-700">Back to My Class</Link>
          <p className="mt-4 text-sm font-bold uppercase tracking-wide text-blue-700">
            {data.identity.enrollment.schoolClass.name}-{data.identity.enrollment.section.name} · {data.subject.subjectName}
          </p>
          <h1 className="mt-2 break-words text-3xl font-bold">{data.subject.subjectName}</h1>
          <p className="mt-2 break-words text-slate-600">Book: {data.subject.book?.title ?? "No approved Smart Book"}</p>
        </header>

        <nav aria-label="Class subject workspace" className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm">
          {tabs.map((item) => (
            <Link
              key={item}
              href={"?tab=" + item}
              className={"shrink-0 rounded-xl px-4 py-3 text-sm font-semibold " + (tab === item ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50")}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </Link>
          ))}
        </nav>

        {tab === "overview" ? (
          <Overview data={data} progress={progress} />
        ) : tab === "learn" ? (
          <Learn data={data} sectionSubjectId={sectionSubjectId} />
        ) : tab === "assignments" ? (
          <Assignments data={data} filter={filter} visibleAssignments={visibleAssignments} />
        ) : tab === "assessments" ? (
          <Assessments data={data} />
        ) : (
          <Progress data={data} progress={progress} complete={complete} sectionSubjectId={sectionSubjectId} />
        )}
      </div>
    </main>
  );
}

function Overview({
  data,
  progress,
}: {
  data: Awaited<ReturnType<typeof getStudentClassSubjectWorkspace>>;
  progress: number;
}) {
  if (!data) return null;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Today's Learning">
        {data.todayLearning ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-blue-700">
              {data.subject.subjectName} · {data.todayLearning.periodSlot?.label ?? "Today's period"}
            </p>
            <h3 className="break-words text-xl font-bold">
              {data.todayLearning.chapter ? "Chapter " + data.todayLearning.chapter.chapterNumber + ": " + data.todayLearning.chapter.title : data.todayLearning.title}
            </h3>
            {data.todayLearning.periodSlot ? <p className="text-sm text-slate-500">{formatMinutes(data.todayLearning.periodSlot.startMinute)}–{formatMinutes(data.todayLearning.periodSlot.endMinute)}</p> : null}
            {data.todayLearning.objective ? <p className="whitespace-pre-wrap text-slate-600">{data.todayLearning.objective}</p> : null}
            {data.todayLearning.page ? (
              <Link href={data.todayLearning.page.href} className="inline-flex min-h-12 items-center rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white">
                Open Smart Book · page {data.todayLearning.page.pageNumber}
              </Link>
            ) : (
              <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Smart Book page unavailable.</p>
            )}
          </div>
        ) : (
          <Empty text="No lesson is scheduled today." />
        )}
      </Card>

      <Card title="To Do">
        {data.toDo.length ? (
          <div className="space-y-3">
            {data.toDo.slice(0, 4).map((entry) => (
              <WorkspaceAction key={entry.kind + ":" + entry.item.id} entry={entry} />
            ))}
          </div>
        ) : (
          <Empty text="No work due right now." />
        )}
      </Card>

      <Card title="Upcoming">
        {data.upcoming.length ? (
          <div className="space-y-3">
            {data.upcoming.slice(0, 4).map((entry) => (
              <WorkspaceAction key={entry.kind + ":" + entry.item.id} entry={entry} />
            ))}
          </div>
        ) : (
          <Empty text="No upcoming work." />
        )}
      </Card>

      <Card title="Recent Results">
        {data.recentResults.length ? (
          <div className="space-y-3">
            {data.recentResults.slice(0, 4).map((entry) => (
              <WorkspaceAction key={entry.kind + ":" + entry.item.id} entry={entry} />
            ))}
          </div>
        ) : (
          <Empty text="Nothing has been graded yet." />
        )}
      </Card>

      <Card title="Subject progress">
        <p className="text-3xl font-bold text-blue-600">{progress}%</p>
        <p className="text-sm text-slate-600">{data.chapters.length ? "Chapter learning progress" : "No approved chapters are available."}</p>
        <Link href="?tab=progress" className="inline-flex min-h-11 items-center rounded-xl border border-blue-200 px-4 py-2 font-semibold text-blue-700">View Progress</Link>
      </Card>
    </div>
  );
}

function Learn({
  data,
  sectionSubjectId,
}: {
  data: Awaited<ReturnType<typeof getStudentClassSubjectWorkspace>>;
  sectionSubjectId: string;
}) {
  if (!data) return null;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Smart Book">
        {data.subject.book ? (
          <>
            <p className="break-words text-slate-600">{data.subject.book.title}</p>
            <Link href={"/student-dashboard/books/" + data.subject.book.id} className="inline-flex min-h-12 items-center rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white">Open Smart Book</Link>
          </>
        ) : <Empty text="No approved Smart Book is available." />}
      </Card>
      <Card title="Chapters">
        {data.chapters.length ? (
          <div className="grid gap-3">
            {data.chapters.map((chapter) => (
              <Link key={chapter.id} href={"/student-dashboard/subjects/" + sectionSubjectId + "/chapters/" + chapter.id} className="rounded-2xl border p-4 hover:border-blue-300">
                <span className="text-sm text-blue-700">Chapter {chapter.chapterNumber}</span>
                <strong className="mt-1 block break-words">{chapter.title}</strong>
                <span className="mt-2 block text-xs text-slate-500">{chapter.studentRevisionProgress[0]?.revisionCompleted ? "Completed" : chapter.studentRevisionProgress.length ? "In progress" : "Not started"}</span>
              </Link>
            ))}
          </div>
        ) : <Empty text="No approved chapters are available." />}
      </Card>
      <Card title="Learning resources">
        {data.subject.resources.length ? data.subject.resources.map((resource) => (
          <a key={resource.id} href={resource.openPath} className="block break-words rounded-xl bg-blue-50 p-3 font-medium text-blue-900">{resource.title} · {resource.type}</a>
        )) : <Empty text="No student resources are available." />}
      </Card>
      <Card title="Teacher class materials">
        {data.materials.length ? data.materials.map((item) => (
          <div key={item.id} className="rounded-xl bg-emerald-50 p-3"><strong className="break-words">{item.title}</strong><p className="text-xs text-slate-600">{item.kind.replaceAll("_", " ")}</p></div>
        )) : <Empty text="No class materials have been shared." />}
      </Card>
    </div>
  );
}

function Assignments({
  data,
  filter,
  visibleAssignments,
}: {
  data: Awaited<ReturnType<typeof getStudentClassSubjectWorkspace>>;
  filter: typeof assignmentFilters[number];
  visibleAssignments: NonNullable<Awaited<ReturnType<typeof getStudentClassSubjectWorkspace>>>["assignments"];
}) {
  if (!data) return null;
  return (
    <div className="space-y-5">
      <Card title="Assignments">
        <nav aria-label="Assignment type filters" className="flex gap-2 overflow-x-auto pb-1">
          {assignmentFilters.map((item) => (
            <Link key={item} href={"?tab=assignments&filter=" + item} className={"shrink-0 rounded-xl px-4 py-2 text-sm font-semibold " + (filter === item ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700")}>
              {item[0] + item.slice(1).toLowerCase()}
            </Link>
          ))}
        </nav>
      </Card>
      {visibleAssignments.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleAssignments.map((item) => {
            const state = studentAssignmentState(item);
            return (
              <article key={item.id} className="flex min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{item.assignmentType}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{state}</span>
                </div>
                <h2 className="mt-3 break-words text-xl font-bold">{item.title}</h2>
                {item.chapterTitle ? <p className="mt-2 break-words text-sm text-slate-600">{item.chapterTitle}</p> : null}
                {item.dueAt ? <p className="mt-2 text-sm font-semibold text-slate-700">Due {formatDate(item.dueAt)}</p> : null}
                {item.totalMarks !== null ? <p className="mt-1 text-sm text-slate-600">{item.totalMarks} marks</p> : null}
                {item.marksAwarded !== null ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">Result: {item.marksAwarded}{item.totalMarks !== null ? " / " + item.totalMarks : ""}</p> : null}
                <Link href={"/student-dashboard/assignments/" + item.id} className="mt-auto inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-4 py-3 font-bold text-white">Open</Link>
              </article>
            );
          })}
        </section>
      ) : <div className="rounded-2xl border bg-white p-10 text-center"><h2 className="text-xl font-bold">No assignments found</h2><p className="mt-2 text-slate-600">Published work for this subject will appear here.</p></div>}
    </div>
  );
}

function Assessments({
  data,
}: {
  data: Awaited<ReturnType<typeof getStudentClassSubjectWorkspace>>;
}) {
  if (!data) return null;
  if (!data.assessments.length) return <Card title="Assessments"><Empty text={data.assessmentState === "LOCKED" ? "Assessments are unavailable for this account." : "No assessments available."} /></Card>;
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.assessments.map((item) => {
        const state = studentAssessmentState(item);
        return (
          <article key={item.id} className="flex min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800">{item.type.replaceAll("_", " ")}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{state}</span>
            </div>
            <h2 className="mt-3 break-words text-xl font-bold">{item.title}</h2>
            {item.chapter ? <p className="mt-2 break-words text-sm text-slate-600">{item.chapter}</p> : null}
            <p className="mt-2 text-sm text-slate-600">{item.totalMarks} marks · {item.totalQuestions} questions</p>
            {item.dueAt ? <p className="mt-1 text-sm text-slate-600">Due {formatDate(item.dueAt)}</p> : null}
            <div className="mt-auto space-y-2 pt-5">
              {item.availability === "START" ? <StudentAssessmentStart assessmentId={item.id} label="Start" /> : null}
              {item.availability === "CONTINUE" && item.attemptId ? <Link href={"/student-dashboard/assessment-attempts/" + item.attemptId} className="inline-flex min-h-12 items-center rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white">Resume</Link> : null}
              {item.availability === "RESULT" && item.attemptId ? <Link href={"/student-dashboard/assessment-attempts/" + item.attemptId + "/result"} className="inline-flex min-h-12 items-center rounded-xl border border-indigo-300 px-5 py-3 font-bold text-indigo-800">View Result</Link> : null}
              {item.availability !== "START" && item.availability !== "CONTINUE" && item.availability !== "RESULT" ? <Link href={"/student-dashboard/assessments/" + item.id} className="inline-flex min-h-12 items-center rounded-xl border px-5 py-3 font-bold text-slate-800">Open</Link> : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function Progress({
  data,
  progress,
  complete,
  sectionSubjectId,
}: {
  data: Awaited<ReturnType<typeof getStudentClassSubjectWorkspace>>;
  progress: number;
  complete: number;
  sectionSubjectId: string;
}) {
  if (!data) return null;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Learning progress">
        <p className="text-4xl font-bold text-blue-700">{progress}%</p>
        <p className="text-slate-600">{complete} of {data.chapters.length} chapter revisions completed</p>
        <Link href="?tab=learn" className="inline-flex min-h-11 items-center rounded-xl border px-4 py-2 font-semibold text-blue-700">Continue Learning</Link>
      </Card>
      <Card title="Assignment results">
        {data.assignments.filter((item) => item.marksAwarded !== null).length ? data.assignments.filter((item) => item.marksAwarded !== null).map((item) => (
          <Link key={item.id} href={"/student-dashboard/assignments/" + item.id} className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 p-3"><span className="break-words font-semibold">{item.title}</span><span className="shrink-0 font-bold">{item.marksAwarded}{item.totalMarks !== null ? " / " + item.totalMarks : ""}</span></Link>
        )) : <Empty text="Nothing has been graded yet." />}
      </Card>
      <Card title="Assessment results">
        {data.assessments.some((item) => item.availability === "RESULT") ? data.assessments.filter((item) => item.availability === "RESULT").map((item) => (
          <Link key={item.id} href={item.attemptId ? "/student-dashboard/assessment-attempts/" + item.attemptId + "/result" : "/student-dashboard/assessments/" + item.id} className="block rounded-xl bg-indigo-50 p-3 font-semibold">{item.title}<span className="ml-2 text-sm text-indigo-800">Graded</span></Link>
        )) : <Empty text="No assessment results are available." />}
      </Card>
      <Card title="Chapters">
        {data.chapters.length ? data.chapters.map((chapter) => (
          <Link key={chapter.id} href={"/student-dashboard/subjects/" + sectionSubjectId + "/chapters/" + chapter.id} className="block rounded-xl border p-3"><span className="text-sm text-blue-700">Chapter {chapter.chapterNumber}</span><strong className="mt-1 block break-words">{chapter.title}</strong></Link>
        )) : <Empty text="No approved chapters are available." />}
      </Card>
    </div>
  );
}

function WorkspaceAction({ entry }: { entry: { kind: "ASSIGNMENT"; item: NonNullable<Awaited<ReturnType<typeof getStudentClassSubjectWorkspace>>>["assignments"][number] } | { kind: "ASSESSMENT"; item: NonNullable<Awaited<ReturnType<typeof getStudentClassSubjectWorkspace>>>["assessments"][number] } }) {
  if (entry.kind === "ASSIGNMENT") {
    return <Link href={"/student-dashboard/assignments/" + entry.item.id} className="block rounded-xl bg-amber-50 p-3"><strong className="block break-words">{entry.item.title}</strong><span className="text-sm text-slate-700">{entry.item.assignmentType} · {studentAssignmentState(entry.item)}</span>{entry.item.dueAt ? <span className="block text-sm text-slate-600">Due {formatDate(entry.item.dueAt)}</span> : null}</Link>;
  }
  return <Link href={"/student-dashboard/assessments/" + entry.item.id} className="block rounded-xl bg-indigo-50 p-3"><strong className="block break-words">{entry.item.title}</strong><span className="text-sm text-slate-700">{studentAssessmentState(entry.item)} · {entry.item.totalMarks} marks</span></Link>;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-4 text-xl font-bold">{title}</h2><div className="space-y-3">{children}</div></section>;
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60).toString().padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return hours + ":" + minutes;
}
