import Link from "next/link";
import { PlatformFeatureKey } from "@prisma/client";

import {
  getParentChildLearningSummary,
  ParentAccessError,
} from "@/lib/parent-dashboard";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { getParentHistoricalReportContext } from "@/lib/report-card-retention";

export default async function ParentReportsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const history = await getParentHistoricalReportContext(studentId);
  let data: Awaited<ReturnType<typeof getParentChildLearningSummary>> | null = null;
  try {
    data = await getParentChildLearningSummary(studentId);
  } catch (error) {
    if (!(error instanceof ParentAccessError)) throw error;
  }
  const advancedEnabled = data
    ? data.plan.plan !== "SCHOOL_BASIC" &&
      await isPublisherFeatureEnabled(data.publisher.id, PlatformFeatureKey.REPORTS)
    : false;

  return <main className="mx-auto max-w-6xl space-y-7 p-4 sm:p-6 lg:p-8">
    <header>
      <Link className="font-bold text-blue-700" href="/parent-dashboard">← Parent dashboard</Link>
      <h1 className="mt-3 break-words text-3xl font-bold">{history.student.name}: reports</h1>
      <p className="mt-2 text-slate-600">Authorized historical records remain available independently of the student&apos;s current school. No rankings or predictions.</p>
    </header>

    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Issued report cards</h2>
      <ul className="mt-4 divide-y">
        {history.reportCards.map((card) => <li key={card.id} className="py-3">
          <p className="break-words font-semibold">{card.schoolDisplayName} · {card.academicYearName}</p>
          <p className="text-sm text-slate-500">{card.classDisplayName} / {card.sectionDisplayName} · Issued {card.issuedAt.toLocaleDateString("en-IN")} · Version {card.version}</p>
        </li>)}
        {!history.reportCards.length ? <li className="py-4 text-sm text-slate-500">No issued report cards yet.</li> : null}
      </ul>
    </section>

    {!data ? <section className="rounded-3xl border bg-white p-8 shadow-sm">
      <h2 className="text-xl font-bold">Current learning summary unavailable</h2>
      <p className="mt-2 text-slate-600">The current school is not operational or no current enrollment is available. Historical issued records above are retained.</p>
    </section> : !advancedEnabled ? <section className="rounded-3xl border bg-white p-8 shadow-sm">
      <h2 className="text-xl font-bold">Advanced reports are not included</h2>
      <p className="mt-2 text-slate-600">Advanced progress summaries require the publisher Reports feature and an eligible premium plan.</p>
    </section> : <>
      <section className="grid gap-4 md:grid-cols-3">
        {data.subjects.map((subject) => <article key={subject.subjectId} className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold">{subject.subject.name}</h2>
          <p className="mt-2 text-slate-600">Overall completion {Math.round(subject.completionPercent)}%</p>
          <p className="text-slate-600">Reading {Math.round(subject.readingPercent)}% · Revision {Math.round(subject.revisionPercent)}%</p>
        </article>)}
      </section>
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Learning consistency</h2>
        <p className="mt-3 text-slate-600">Current streak: {data.analytics?.currentStreak ?? 0} day(s). Longest recorded streak: {data.analytics?.longestStreak ?? 0} day(s).</p>
      </section>
    </>}
  </main>;
}
