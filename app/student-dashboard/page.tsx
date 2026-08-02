import Link from "next/link";
import { BookOpen, CalendarCheck2, CalendarClock, ClipboardList, Megaphone } from "lucide-react";
import StudentClassChat from "@/components/student/StudentClassChat";
import { requireStudentDashboardAccess } from "@/lib/student-dashboard";
import { getStudentClassroomData } from "@/lib/student-classroom-data";

export default async function StudentDashboardPage() {
  const access = await requireStudentDashboardAccess();
  if (access.status !== "READY") return <Blocked access={access} />;

  const data = await getStudentClassroomData();
  const resume = data.progress[0];
  const resumeSubject = resume ? data.subjects.find((item) => item.book?.id === resume.bookId) : null;

  return (
    <main className="space-y-6 p-4 sm:p-8">
      <section>
        <p className="font-medium text-blue-600">Welcome back, {data.identity.student.name.split(" ")[0]}</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">What will you learn today?</h1>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.7fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 p-7 text-white shadow-lg">
            <p className="text-sm font-semibold text-blue-100">Continue learning</p>
            {resume && resumeSubject?.book ? (
              <>
                <h2 className="mt-3 text-2xl font-bold">{resumeSubject.book.title}</h2>
                <p className="mt-2 text-blue-100">Last read page {resume.lastPage}</p>
                {resume.totalPages ? (
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${Math.min(100, Math.round((resume.lastPage / resume.totalPages) * 100))}%` }}
                    />
                  </div>
                ) : null}
                <Link
                  href={`/student-dashboard/books/${resume.bookId}`}
                  className="mt-6 inline-flex rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white"
                >
                  Resume learning
                </Link>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-2xl font-bold">Your next learning moment starts here.</h2>
                <p className="mt-2 text-blue-100">
                  Open a subject in My Class to begin. Progress appears after a real learning activity.
                </p>
                <Link
                  href="/student-dashboard/my-class"
                  className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 font-bold text-blue-700"
                >
                  Explore My Class
                </Link>
              </>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              icon={ClipboardList}
              tone="blue"
              title="Assignments Due"
              value={String(data.assignments.length)}
              detail={data.assignments[0]?.title ?? "Nothing due"}
              href={data.assignments[0] ? `/student-dashboard/assignments/${data.assignments[0].id}` : undefined}
            />
            <InfoCard
              icon={CalendarClock}
              tone="amber"
              title="Upcoming Test"
              value={data.assessments[0]?.title ?? "No test"}
              detail={formatDate(data.assessments[0]?.opensAt ?? data.assessments[0]?.dueAt)}
              href={data.assessments[0] ? `/student-dashboard/assessments/${data.assessments[0].id}` : undefined}
            />
            <InfoCard
              icon={Megaphone}
              tone="purple"
              title="Announcement"
              value={data.announcement?.title ?? "No announcement"}
              detail={data.announcement?.description ?? "You are all caught up."}
            />
            <InfoCard
              icon={CalendarCheck2}
              tone="emerald"
              title="Attendance"
              value="View report"
              detail="Check your monthly attendance, today status, and history."
              href="/student-dashboard/attendance"
            />
          </div>

          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Learning progress</h2>
            {data.subjects.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.subjects.map((subject) => {
                  const item = data.progress.find((progress) => progress.bookId === subject.book?.id);
                  const value = item?.totalPages
                    ? Math.min(100, Math.round((item.lastPage / item.totalPages) * 100))
                    : 0;

                  return (
                    <div key={subject.sectionSubjectId} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                      <span className="grid h-12 w-12 place-items-center rounded-full border-4 border-blue-200 font-bold text-blue-700">
                        {value}%
                      </span>
                      <strong>{subject.subjectName}</strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-slate-500">Your active subjects will appear here.</p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Today&apos;s classes</h2>
            {data.today.length ? (
              <div className="mt-4 space-y-3">
                {data.today.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-blue-50 p-4">
                    <strong>{item.sectionSubject?.subject.name ?? item.title}</strong>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.currentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No classes are scheduled for today.</p>
            )}
            <Link href="/student-dashboard/planner" className="mt-5 inline-flex font-semibold text-blue-600">
              View full schedule
            </Link>
          </section>
          <StudentClassChat compact />
        </aside>
      </div>
    </main>
  );
}

function Blocked({ access }: { access: Awaited<ReturnType<typeof requireStudentDashboardAccess>> }) {
  const message =
    access.status === "ACCESS_BLOCKED"
      ? access.message
      : access.status === "NO_ENROLMENT"
        ? "Your active enrolment is not available."
        : access.status === "NO_CLASS_OR_SECTION"
          ? "Your class and section are not assigned."
          : access.status === "NO_ENTITLEMENTS"
            ? "Learning content has not been assigned yet."
            : "Student learning is not enabled for your school.";

  return (
    <main className="p-8">
      <section className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-2xl font-bold text-amber-950">Student access unavailable</h1>
        <p className="mt-3 text-amber-800">{message}</p>
      </section>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
  detail,
  href,
  tone,
}: {
  icon: typeof BookOpen;
  tone: "blue" | "amber" | "purple" | "emerald";
  title: string;
  value: string;
  detail: string;
  href?: string;
}) {
  const iconTone =
    tone === "amber"
      ? "text-amber-600"
      : tone === "purple"
        ? "text-purple-600"
        : tone === "emerald"
          ? "text-emerald-600"
          : "text-blue-600";

  const content = (
    <>
      <Icon className={`h-7 w-7 ${iconTone}`} />
      <p className="mt-4 text-sm font-semibold text-slate-500">{title}</p>
      <h2 className="mt-1 line-clamp-2 text-lg font-bold">{value}</h2>
      <p className="mt-2 line-clamp-2 text-sm text-slate-500">{detail}</p>
    </>
  );

  if (!href) {
    return <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">{content}</article>;
  }

  return (
    <Link href={href} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5">
      {content}
    </Link>
  );
}

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "No date scheduled";
}
