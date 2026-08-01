import { getMentorStudentProfile } from "@/lib/mentor-dashboard";

function labelForProgress(value: number) {
  if (value >= 75) return "On Track";
  if (value >= 50) return "Needs Practice";
  if (value >= 35) return "Improving";
  return "Needs Support";
}

export default async function MentorStudentLearningPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const profile = await getMentorStudentProfile(studentId);

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Learning</h2>
        <p className="mt-2 text-sm text-slate-600">Subject-wise progress from published analytics and activity only.</p>

        {profile.subjects.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 pr-3">Current status</th>
                  <th className="py-2 pr-3">Progress</th>
                  <th className="py-2 pr-3">Completed Chapters</th>
                  <th className="py-2 pr-3">Current Chapter</th>
                  <th className="py-2">Support area</th>
                </tr>
              </thead>
              <tbody>
                {profile.subjects.map((subject) => {
                  const progress = Math.round(subject.completionPercent);
                  const status = labelForProgress(progress);
                  const matchingChapter = profile.chapters.find((chapter) => chapter.lastActivityAt);
                  const support = profile.gaps.find((gap) => gap.subjectId === subject.subjectId);
                  return (
                    <tr key={subject.id} className="border-t border-slate-100">
                      <td className="py-3 pr-3 font-semibold text-slate-900">{subject.subject.name}</td>
                      <td className="py-3 pr-3 text-slate-700">{status}</td>
                      <td className="py-3 pr-3 text-slate-700">{progress}%</td>
                      <td className="py-3 pr-3 text-slate-600">{subject.booksCompleted}</td>
                      <td className="py-3 pr-3 text-slate-600">{matchingChapter ? `${matchingChapter.chapter.chapterNumber}. ${matchingChapter.chapter.title}` : "Not available"}</td>
                      <td className="py-3 text-slate-600">{support ? support.skillLabel ?? support.chapter?.title ?? "Needs support" : "No active support area"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No subject analytics are available yet.</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Recent Activity</h2>
        {profile.timeline.length ? (
          <ul className="mt-4 space-y-3">
            {profile.timeline.slice(0, 12).map((item) => (
              <li key={item.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.activityType.replaceAll("_", " ")} · {item.occurredAt.toLocaleString("en-IN")}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No recent learning activity is available.</p>
        )}
      </section>
    </main>
  );
}
