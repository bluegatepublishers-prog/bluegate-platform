import Link from "next/link";
import { BookOpen, CalendarDays, GraduationCap, School, Sparkles } from "lucide-react";
import StudentSubjectCard from "@/components/student/StudentSubjectCard";
import StudentLibraryBookCard from "@/components/student/StudentLibraryBookCard";
import { getPublisherBranding } from "@/lib/publisher-context";
import { requireStudentDashboardAccess } from "@/lib/student-dashboard";
import { getStudentSubjects } from "@/lib/student-subjects";
import { getStudentBooks } from "@/lib/student-books";
import { getStudentCompletedRevisions } from "@/lib/student-revision";

export default async function StudentDashboardPage() {
  const access = await requireStudentDashboardAccess();
  const isReadyIdentity =
    access.status === "READY" ||
    access.status === "FEATURE_DISABLED" ||
    access.status === "NO_ENTITLEMENTS";
  const identity = isReadyIdentity ? access.identity : null;
  const shell = isReadyIdentity
    ? {
        studentName: access.identity.student.name,
        schoolName: access.identity.school.schoolName,
        className: access.identity.enrollment.schoolClass.name,
        sectionName: access.identity.enrollment.section.name,
        academicYearName: access.identity.academicYear.name,
      }
    : access.shell;
  const branding = await getPublisherBranding(
    isReadyIdentity ? access.identity.publisher.id : access.shell.publisherId,
  );
  const subjects = access.status === "READY" ? await getStudentSubjects() : [];
  const books = access.status === "READY" ? await getStudentBooks() : [];
  const completedRevisions =
    access.status === "READY" ? await getStudentCompletedRevisions() : [];
  const restrictedMessage =
    access.status === "NO_ENROLMENT"
      ? "Your enrolment has not been completed yet. Please contact your school."
      : access.status === "NO_CLASS_OR_SECTION"
        ? "Your class and section have not been assigned yet."
        : access.status === "NO_ENTITLEMENTS"
          ? "Learning resources have not yet been assigned to your account."
          : access.status === "FEATURE_DISABLED"
            ? "This learning feature is not currently enabled for your institution."
            : null;
  const greeting = getGreeting(new Date());
  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl p-7 text-white shadow-xl sm:p-10" style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}>
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-semibold text-white/75">{greeting}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome, {shell.studentName}</h1>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4" />{shell.className ? `${shell.className} · Section ${shell.sectionName ?? "-"}` : "Class assignment pending"}</span>
              <span className="inline-flex items-center gap-2"><School className="h-4 w-4" />{shell.schoolName}</span>
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{shell.academicYearName ?? "Academic year pending"}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {identity ? <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold ring-1 ring-white/25">{formatPlan(identity.effectivePlan.plan)}</span> : null}
            {books.length && access.status === "READY" ? (
              <Link href="/student-dashboard/books" className="rounded-xl bg-white px-5 py-3 font-bold text-slate-800">Continue Reading</Link>
            ) : (
              <button disabled className="rounded-xl bg-white px-5 py-3 font-bold text-slate-700 opacity-80">Continue Learning</button>
            )}
          </div>
        </div>
      </section>
      {restrictedMessage ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-amber-900">Limited dashboard access</h2>
          <p className="mt-2 text-amber-800">{restrictedMessage}</p>
        </section>
      ) : null}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-bold">My Books</h2><p className="mt-2 text-slate-600">Continue reading books approved for your current class.</p></div>{books.length > 0 && <Link href="/student-dashboard/books" className="rounded-xl border bg-white px-5 py-3 font-semibold text-slate-800">View All Books</Link>}</div>
        {books.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{books.slice(0, 4).map((book) => <StudentLibraryBookCard key={book.id} book={book} />)}</div> : <div className="mt-5 rounded-3xl border bg-white p-10 text-center shadow-sm"><h3 className="text-xl font-bold">No approved books are available yet.</h3><p className="mt-2 text-slate-600">Your school will add books for your subjects.</p></div>}
      </section>

      {completedRevisions.length > 0 && <section><h2 className="text-2xl font-bold">Revision Completed</h2><p className="mt-2 text-slate-600">Your completed chapter revisions for the current academic year.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{completedRevisions.map((item) => <Link key={`${item.chapter.id}-${item.updatedAt.toISOString()}`} href={`/student-dashboard/books/${item.chapter.bookId}/chapters/${item.chapter.id}/revision`} className="rounded-3xl border bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-green-700">Revision Completed</p><h3 className="mt-2 font-bold">Chapter {item.chapter.chapterNumber}: {item.chapter.title}</h3><p className="mt-2 text-sm text-slate-500">{item.chapter.book.title}</p></Link>)}</div></section>}

      <section id="today">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-bold">My Subjects</h2><p className="mt-2 text-slate-600">Approved books and student-ready resources for your class.</p></div>{subjects.length > 0 && <Link href="/student-dashboard/subjects" className="rounded-xl border bg-white px-5 py-3 font-semibold text-slate-800">View All Subjects</Link>}</div>
        {subjects.length ? <div className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{subjects.slice(0, 6).map((subject) => <StudentSubjectCard key={subject.sectionSubjectId} subject={subject} />)}</div> : <div className="mt-5 rounded-3xl border bg-white p-10 text-center shadow-sm"><h3 className="text-xl font-bold">No subjects are available yet.</h3><p className="mt-2 text-slate-600">Your school will add subjects to your class.</p></div>}
      </section>
      <section className="grid gap-5 md:grid-cols-2">
        <Placeholder icon={Sparkles} title="Today" description="There are no student learning activities scheduled in this phase." />
        <Placeholder icon={CalendarDays} title="School Context" description={`${shell.className ?? "Class pending"}, Section ${shell.sectionName ?? "pending"} · ${shell.academicYearName ?? "Academic year pending"}`} />
      </section>
    </main>
  );
}

function Placeholder({ icon: Icon, title, description }: { icon: typeof BookOpen; title: string; description: string }) {
  return <article className="rounded-3xl border bg-white p-6 shadow-sm"><Icon className="h-8 w-8 text-slate-400" /><h2 className="mt-5 text-xl font-bold">{title}</h2><p className="mt-3 text-slate-600">{description}</p></article>;
}

function getGreeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function formatPlan(plan: string) {
  return plan.split("_").map((part) => part[0] + part.slice(1).toLowerCase()).join(" ");
}
