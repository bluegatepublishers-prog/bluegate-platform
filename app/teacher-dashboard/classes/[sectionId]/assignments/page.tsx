import AssignmentList from "@/components/assignments/AssignmentList";
import { getTeacherAssignments } from "@/lib/assignments/queries";

export default async function Page({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const { assignments } = await getTeacherAssignments(sectionId);
  return <AssignmentList sectionId={sectionId} assignments={assignments} />;
}
