import { getMentorStudentProfile } from "@/lib/mentor-dashboard";

export default async function MentorStudentAssessmentsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const profile = await getMentorStudentProfile(studentId);

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Assessments</h2>
        <p className="mt-2 text-sm text-slate-600">Only published or released assessment outcomes are visible to mentors.</p>

        {profile.assessments.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Assessment</th>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Upcoming / Completed</th>
                  <th className="py-2 pr-3">Published score</th>
                  <th className="py-2">Areas needing support</th>
                </tr>
              </thead>
              <tbody>
                {profile.assessments.map((assessment) => {
                  const attempt = assessment.attempts[0];
                  const published = Boolean(attempt?.result?.publishedAt);
                  const scoreVisible = published && assessment.settings?.showScore !== false;
                  return (
                    <tr key={assessment.id} className="border-t border-slate-100">
                      <td className="py-3 pr-3 font-semibold text-slate-900">{assessment.title}</td>
                      <td className="py-3 pr-3 text-slate-600">{assessment.sectionSubject.subject.name}</td>
                      <td className="py-3 pr-3 text-slate-700">{assessment.status}</td>
                      <td className="py-3 pr-3 text-slate-600">{assessment.dueAt ? assessment.dueAt.toLocaleDateString("en-IN") : assessment.opensAt ? assessment.opensAt.toLocaleDateString("en-IN") : "Not scheduled"}</td>
                      <td className="py-3 pr-3 text-slate-700">{scoreVisible ? `${Math.round(attempt!.result!.percentage ?? 0)}%` : "Not released"}</td>
                      <td className="py-3 text-slate-600">{profile.gaps.find((gap) => gap.subjectId === assessment.sectionSubject.subjectId) ? "Review support plan" : "No active area"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No assessment records are available for this student.</p>
        )}
      </section>
    </main>
  );
}
