"use server";

import { revalidatePath } from "next/cache";
import { recomputeStudentGaps } from "@/lib/gaps/detect";
import { GapReviewError, reviewStudentGap } from "@/lib/gaps/review";
import { requireTeacherGap } from "@/lib/gaps/teacher";

export async function reviewGapAction(formData: FormData) {
  try {
    const gapId = String(formData.get("gapId") ?? "");
    await reviewStudentGap({ gapId, action: String(formData.get("action") ?? ""), reason: formData.get("reason") });
    revalidatePath("/teacher-dashboard/gaps");
    revalidatePath(`/teacher-dashboard/gaps/${gapId}`);
  } catch (error) {
    throw new Error(error instanceof GapReviewError ? error.message : "The review could not be saved.");
  }
}

export async function recomputeGapAction(formData: FormData) {
  const gapId = String(formData.get("gapId") ?? "");
  const { gap } = await requireTeacherGap(gapId);
  await recomputeStudentGaps({ studentId: gap.studentId, academicYearId: gap.academicYearId });
  revalidatePath("/teacher-dashboard/gaps");
  revalidatePath(`/teacher-dashboard/gaps/${gapId}`);
}
