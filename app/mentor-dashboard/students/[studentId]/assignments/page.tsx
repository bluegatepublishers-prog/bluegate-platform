import { getMentorStudentProfile } from "@/lib/mentor-dashboard";

export default async function MentorStudentAssignmentsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const profile = await getMentorStudentProfile(studentId);

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Assignments</h2>
        <p className="mt-2 text-sm text-slate-600">Read-only assignment progress with released feedback for this student.</p>

        {profile.assignments.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Assignment</th>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 pr-3">Due date</th>
                  <th className="py-2 pr-3">Submission status</th>
                  <th className="py-2 pr-3">Published score</th>
                  <th className="py-2">Released teacher feedback</th>
                </tr>
              </thead>
              <tbody>
                {profile.assignments.map((assignment) => {
                  const submission = assignment.submissions[0];
                  const feedbackVisible = Boolean(submission?.teacherFeedback && (submission.status === "GRADED" || submission.status === "RETURNED"));
                  return (
                    <tr key={assignment.id} className="border-t border-slate-100">
                      <td className="py-3 pr-3 font-semibold text-slate-900">{assignment.title}</td>
                      <td className="py-3 pr-3 text-slate-600">{assignment.subject?.name ?? "Not specified"}</td>
                      <td className="py-3 pr-3 text-slate-600">{assignment.dueAt ? assignment.dueAt.toLocaleDateString("en-IN") : "No due date"}</td>
                      <td className="py-3 pr-3 text-slate-700">{submission ? `${submission.status}${submission.isLate ? " · Late" : ""}` : "Not submitted"}</td>
                      <td className="py-3 pr-3 text-slate-700">{submission?.marksAwarded == null ? "Not released" : submission.marksAwarded}</td>
                      <td className="py-3 text-slate-600">{feedbackVisible ? submission!.teacherFeedback : "Not released"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No assignment data is currently available.</p>
        )}
      </section>
    </main>
  );
}
