import AssignmentList from "@/components/assignments/AssignmentList";
import { getTeacherAssignments } from "@/lib/assignments/queries";
import { requireTeacherSubject } from "@/lib/teacher-experience";

export default async function Page({ params, searchParams }: { params: Promise<{ sectionId: string }>; searchParams: Promise<{ subject?: string }> }) {
  const { sectionId } = await params;
  const selected = (await searchParams).subject;
  if (selected) await requireTeacherSubject(sectionId, selected);
  const { assignments } = await getTeacherAssignments(sectionId);
  return <AssignmentList sectionId={sectionId} subjectId={selected} assignments={selected ? assignments.filter((item) => item.sectionSubjectId === selected) : assignments} />;
}
