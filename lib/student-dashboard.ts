import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRoleDestination } from "@/lib/auth-policy";
import { loadStudentIdentity } from "@/lib/student-identity";

async function requireStudentUncached() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/student-login");
  if (user.role !== "STUDENT") redirect(getRoleDestination(user.role) ?? "/");

  const identity = await loadStudentIdentity(user.id, user.role, user.publisherId);
  if (!identity.ok) redirect("/student-login?error=student_access_unavailable");

  const claimsMatch =
    user.studentId === identity.value.student.id &&
    user.schoolId === identity.value.school.id &&
    user.publisherId === identity.value.publisher.id &&
    user.academicYearId === identity.value.academicYear.id;
  if (!claimsMatch) redirect("/student-login?error=session_refresh_required");
  return identity.value;
}

export const requireStudent = cache(requireStudentUncached);
