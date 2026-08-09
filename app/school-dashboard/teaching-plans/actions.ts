"use server";

import { getSchoolTeachingPlanPreview } from "@/lib/school-teaching-plan";

export async function getSchoolTeachingPlanPreviewAction(input: {
  planId: string;
  periodId: string;
  pageRefId: string;
}) {
  return getSchoolTeachingPlanPreview(input);
}
