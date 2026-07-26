import StudentAssignmentList from "@/components/assignments/StudentAssignmentList";
import { getStudentAssignments } from "@/lib/assignments/queries";

export default async function Page() {
  const { assignments } = await getStudentAssignments();
  return <main className="space-y-6 p-4 sm:p-6 lg:p-8"><StudentAssignmentList assignments={assignments} /></main>;
}

