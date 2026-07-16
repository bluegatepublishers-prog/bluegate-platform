"use server";
import { revalidatePath } from "next/cache";
import { recomputeRemedialPlan, reviewRemedialPlan, teacherCloseRemedialStep } from "@/lib/remedials/review";
export async function reviewPlanAction(data: FormData) { await reviewRemedialPlan(String(data.get("planId") ?? "")); revalidatePath("/teacher-dashboard/remedials"); }
export async function recomputePlanAction(data: FormData) { await recomputeRemedialPlan(String(data.get("planId") ?? "")); revalidatePath("/teacher-dashboard/remedials"); }
export async function closeStepAction(data: FormData) { await teacherCloseRemedialStep(String(data.get("stepId") ?? ""), String(data.get("planId") ?? "")); revalidatePath("/teacher-dashboard/remedials"); }
