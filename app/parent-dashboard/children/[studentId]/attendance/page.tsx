import { getParentChildPortalData } from "@/lib/parent-dashboard";

export default async function ParentChildAttendancePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await getParentChildPortalData(studentId);
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-950">Attendance</h2><p className="mt-4 text-slate-600">Attendance data is not available yet.</p><p className="mt-3 text-sm text-slate-500">If the school publishes attendance records later, they will appear here for {data.student.name}.</p></section>;
}