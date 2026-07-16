import "server-only";

import { recomputeStudentGapsBestEffort } from "@/lib/gaps";
import { generateRemedialsBestEffort } from "@/lib/remedials/path";

export async function refreshLearningSupportBestEffort(scope: { studentId: string; academicYearId: string }) {
  await recomputeStudentGapsBestEffort(scope);
  await generateRemedialsBestEffort(scope);
}
