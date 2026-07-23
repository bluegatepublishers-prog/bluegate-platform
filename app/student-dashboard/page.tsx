import Link from "next/link";
import { BookOpen, CalendarDays, GraduationCap, School, Sparkles, ClipboardCheck } from "lucide-react";
import StudentLibraryBookCard from "@/components/student/StudentLibraryBookCard";
import { getPublisherBranding } from "@/lib/publisher-context";
import { requireStudent } from "@/lib/student-dashboard";
import { getStudentSubjects } from "@/lib/student-subjects";
import { getStudentBooks } from "@/lib/student-books";
import { getStudentAssessments } from "@/lib/student-assessments";
import { getStudentGaps } from "@/lib/gaps/student";
import { getStudentRemedialPlans } from "@/lib/remedials/student";
import { getPremiumFeatureEntitlementForAuthenticatedUser } from "@/lib/entitlements/features";

export default async function StudentDashboardPage() {
  const identity = await requireStudent();
  const branding = await getPublisherBranding(identity.publisher.id);
  const [subjects, books, assessments, gapsReport, remedialsReport] = await Promise.all([
    getStudentSubjects(),
    getStudentBooks(),
    getStudentAssessments(),
    getStudentGaps(),
    getStudentRemedialPlans(),
  ]);

  const currentBook = books[0];
  const continueHref = currentBook
    ? `/student-dashboard/books/${currentBook.id}`
    : subjects[0]
      ? `/student-dashboard/subjects/${subjects[0].sectionSubjectId}`
      : assessments.assessments[0]
        ? `/student-dashboard/assessment-attempts/${assessments.assessments[0].attemptId}`
        : "/student-dashboard/books";

  const aiEntitlement = identity.student.userId
    ? await getPremiumFeatureEntitlementForAuthenticatedUser({ id: identity.student.userId, role: "STUDENT" }, { feature: "STUDENT_AI", academicYearId: identity.academicYear.id })
    : { allowed: false };

  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl p-7 text-white shadow-xl sm:p-10" style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}>
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-semibold text-white/75">{getGreeting(new Date())}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome, {identity.student.name}</h1>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4" />{identity.enrollment.schoolClass.name} · Section {identity.enrollment.section.name}</span>
              <span className="inline-flex items-center gap-2"><School className="h-4 w-4" />{identity.school.schoolName}</span>
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{identity.academicYear.name}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold ring-1 ring-white/25">{formatPlan(identity.effectivePlan.plan)}</span>
            <Link href={continueHref} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-800">
              Continue Learning
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={BookOpen} label="Books started" value={books.length.toString()} href="/student-dashboard/books" />
        <StatCard icon={ClipboardCheck} label="Assessments" value={assessments.assessments.filter((a) => a.availability === "START" || a.availability === "CONTINUE").length.toString()} href="/student-dashboard/assessments" />
        <StatCard icon={Sparkles} label="AI Assistant" value={aiEntitlement.allowed ? "Enabled" : "Premium"} href={aiEntitlement.allowed && currentBook ? `/student-dashboard/books/${currentBook.id}/chapters/1/assistant` : "/student-dashboard/books"} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Continue Learning</h2>
          <p className="mt-2 text-slate-600">Pick up where you left off.</p>
          <ContinueList
            items={[
              currentBook && { label: `Current book: ${currentBook.title}`, href: `/student-dashboard/books/${currentBook.id}`, icon: BookOpen },
              subjects[0] && !currentBook ? { label: `Current subject: ${subjects[0].subjectName}`, href: `/student-dashboard/subjects/${subjects[0].sectionSubjectId}`, icon: GraduationCap } : null,
              assessments.assessments[0] && !currentBook && !subjects[0] ? { label: `Latest assessment: ${assessments.assessments[0].title}`, href: `/student-dashboard/assessments`, icon: ClipboardCheck } : null,
              aiEntitlement.allowed && currentBook ? { label: "AI Learning Assistant", href: `/student-dashboard/books/${currentBook.id}/chapters/1/assistant`, icon: Sparkles } : null,
            ].filter(Boolean)}
          />
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-3xl border bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">My Books</h2>
              <p className="mt-2 text-slate-600">Approved books for your current class.</p>
            </div>
            {books.length > 0 && <Link href="/student-dashboard/books" className="rounded-xl border bg-white px-5 py-3 font-semibold text-slate-800">View All Books</Link>}
          </div>
          {books.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{books.slice(0, 4).map((book) => <StudentLibraryBookCard key={book.id} book={book} />)}</div> : <div className="mt-5 rounded-3xl border bg-white p-10 text-center shadow-sm"><h3 className="text-xl font-bold">No approved books are available yet.</h3><p className="mt-2 text-slate-600">Your school will add books for your subjects.</p></div>}
        </article>
        <article className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">My Subjects</h2>
          <p className="mt-2 text-slate-600">Approved books and student-ready resources.</p>
          {subjects.length ? (
            <ol className="mt-5 space-y-3">
              {subjects.slice(0, 6).map((subject) => (
                <li key={subject.sectionSubjectId}>
                  <Link href={`/student-dashboard/subjects/${subject.sectionSubjectId}`} className="block rounded-2xl border bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-white">
                    <p className="font-bold text-slate-900">{subject.subjectName}</p>
                    <p className="mt-1 text-sm text-slate-600">{subject.book ? subject.book.title : "No approved book yet"}</p>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed bg-white p-6 text-center"><p className="text-sm font-semibold text-slate-600">No subjects are available yet.</p></div>
          )}
          {subjects.length > 0 && <Link href="/student-dashboard/subjects" className="mt-4 inline-flex rounded-xl border bg-white px-5 py-3 font-semibold text-slate-800">View All Subjects</Link>}
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Recent Assessments</h2>
          <p className="mt-2 text-slate-600">Upcoming and available assessments.</p>
          {assessments.state === "AVAILABLE" && assessments.assessments.length > 0 ? (
            <ol className="mt-5 space-y-3">
              {assessments.assessments.slice(0, 5).map((assessment) => (
                <li key={assessment.id}>
                  <Link href={assessment.availability === "START" || assessment.availability === "CONTINUE" ? `/student-dashboard/assessments` : `/student-dashboard/assessment-attempts/${assessment.attemptId}`} className="block rounded-2xl border bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">{assessment.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{assessment.bookTitle}</p>
                    <p className="mt-1 text-xs font-semibold text-indigo-700">{assessment.availability.replaceAll("_", " ")}</p>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No assessments are available yet.</p>
          )}
          <Link href="/student-dashboard/assessments" className="mt-4 inline-flex rounded-xl border bg-white px-5 py-3 font-semibold text-slate-800">View Assessments</Link>
        </article>

        <article className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Learning Gaps</h2>
          <p className="mt-2 text-slate-600">Evidence-based learning signals from your recent activity.</p>
          {gapsReport.state === "READY" ? (
            <>
              {gapsReport.gaps.filter((g) => g.status === "OPEN" || g.status === "ACKNOWLEDGED").length > 0 ? (
                <ol className="mt-5 space-y-3">
                  {gapsReport.gaps.filter((g) => g.status === "OPEN" || g.status === "ACKNOWLEDGED").slice(0, 5).map((gap) => (
                    <li key={gap.id}>
                      <Link href={`/student-dashboard/gaps/${gap.id}`} className="block rounded-2xl border bg-slate-50 p-4">
                        <p className="font-bold text-slate-900">{gap.learningArea}</p>
                        <p className="mt-1 text-xs font-semibold text-amber-700">{gap.severityLabel}</p>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No learning gaps have been identified yet.</p>
              )}
              <Link href="/student-dashboard/gaps" className="mt-4 inline-flex rounded-xl border bg-white px-5 py-3 font-semibold text-slate-800">View Learning Focus</Link>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Learning gap analysis is not available.</p>
          )}
        </article>

        <article className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Remedial Learning</h2>
          <p className="mt-2 text-slate-600">Teacher-reviewed support steps.</p>
          {remedialsReport.state === "READY" && remedialsReport.plans.length > 0 ? (
            <ol className="mt-5 space-y-3">
              {remedialsReport.plans.slice(0, 5).map((plan) => (
                <li key={plan.id}>
                  <Link href={`/student-dashboard/remedials`} className="block rounded-2xl border bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">{plan.learningArea}</p>
                    <p className="mt-1 text-xs font-semibold text-indigo-700">{plan.completed}/{plan.total} required steps</p>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No teacher-reviewed learning path is assigned right now.</p>
          )}
          <Link href="/student-dashboard/remedials" className="mt-4 inline-flex rounded-xl border bg-white px-5 py-3 font-semibold text-slate-800">View Learning Path</Link>
        </article>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {aiEntitlement.allowed && currentBook ? (
          <Link href={`/student-dashboard/books/${currentBook.id}/chapters/1/assistant`} className="rounded-3xl border bg-white p-6 shadow-sm transition hover:border-indigo-200">
            <div className="flex items-center gap-3"><Sparkles className="h-8 w-8 text-indigo-600" /><div><h2 className="text-xl font-bold">AI Learning Assistant</h2><p className="mt-2 text-slate-600">Ask questions about {currentBook.title}.</p></div></div>
          </Link>
        ) : (
          <article className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><Sparkles className="h-8 w-8 text-slate-400" /><div><h2 className="text-xl font-bold">AI Learning Assistant</h2><p className="mt-2 text-slate-600">Available with Premium.</p></div></div>
          </article>
        )}
        <article className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">School Context</h2>
          <p className="mt-2 text-slate-600">{identity.enrollment.schoolClass.name}, Section {identity.enrollment.section.name} · {identity.academicYear.name}</p>
        </article>
      </section>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, href }: { icon: typeof BookOpen; label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-3xl border bg-white p-5 shadow-sm transition hover:border-indigo-200">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <Icon className="h-8 w-8 text-indigo-600" />
      </div>
    </Link>
  );
}

function ContinueList({ items }: { items: Array<{ label: string; href: string; icon: typeof BookOpen } | null> }) {
  const filtered = items.filter(Boolean) as Array<{ label: string; href: string; icon: typeof BookOpen }>;
  if (!filtered.length) return <p className="mt-4 text-sm text-slate-500">No supported learning activity yet.</p>;
  return (
    <ol className="mt-5 space-y-3">
      {filtered.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="flex items-center gap-3 rounded-2xl border bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-white">
            <item.icon className="h-5 w-5 text-indigo-700" />
            <span className="font-semibold text-slate-900">{item.label}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function getGreeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function formatPlan(plan: string) {
  return plan.split("_").map((part) => part[0] + part.slice(1).toLowerCase()).join(" ");
}