"use server";
import { revalidatePath } from "next/cache";
import { updateOwnRemedialStep } from "@/lib/remedials/completion";
export async function updateRemedialStepAction(data: FormData) { const action = String(data.get("action")); if (action !== "START" && action !== "COMPLETE") return; await updateOwnRemedialStep({ stepId: String(data.get("stepId") ?? ""), action }); revalidatePath("/student-dashboard/remedials"); }
