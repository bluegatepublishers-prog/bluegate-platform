"use server";

import { revalidatePath } from "next/cache";

import { requireSchool } from "@/lib/school-dashboard";
import { StudentAccountManagementError, resetStudentPasswordForSchool } from "@/lib/student-account-management";

export type StudentPasswordResetState = {
  ok: boolean;
  message: string;
  loginId?: string | null;
  temporaryPassword?: string;
};

export const INITIAL_STUDENT_PASSWORD_RESET_STATE: StudentPasswordResetState = { ok: false, message: "" };

export async function resetStudentPasswordAction(
  _previous: StudentPasswordResetState,
  form: FormData,
): Promise<StudentPasswordResetState> {
  const school = await requireSchool();
  const studentId = String(form.get("studentId") ?? "").trim();
  if (!studentId || !school.publisherId) return { ok: false, message: "This student account is not available for a school reset." };
  try {
    const result = await resetStudentPasswordForSchool({
      studentId,
      schoolId: school.id,
      actorUserId: school.userId,
      publisherId: school.publisherId,
    });
    revalidatePath(`/school-dashboard/students/${studentId}`);
    return { ok: true, message: "Password reset. Share these credentials once with the student.", ...result };
  } catch (error) {
    if (error instanceof StudentAccountManagementError) return { ok: false, message: error.message };
    return { ok: false, message: "This student account is not available for a school reset." };
  }
}
