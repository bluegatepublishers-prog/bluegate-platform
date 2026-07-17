"use server";

import { TeacherAiPlan } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminTeacherOwnership } from "@/lib/publisher-admin-data";

export async function updateTeacherAiPlan(teacherId: string, formData: FormData) {
  const actor = await requirePublisherAdminTeacherOwnership(teacherId);
  const raw = String(formData.get("aiPlan") ?? "");
  const plan = raw === "PREMIUM" ? TeacherAiPlan.PREMIUM : TeacherAiPlan.STANDARD;
  const expiryRaw = String(formData.get("aiPlanExpiresAt") ?? "").trim();
  const expiry = expiryRaw ? new Date(`${expiryRaw}T23:59:59+05:30`) : null;
  if (expiry && Number.isNaN(expiry.getTime())) return { ok: false, message: "Invalid expiry date." };
  const updated = await prisma.teacher.updateMany({
    where: { id: teacherId, school: { publisherId: actor.publisherId } },
    data: { aiPlan: plan, aiDailyLimit: plan === TeacherAiPlan.PREMIUM ? 5 : 0, aiPlanExpiresAt: expiry },
  });
  if (updated.count !== 1) return { ok: false, message: "Unable to update this teacher." };
  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${teacherId}`);
  revalidatePath("/teacher-dashboard/ai");
  return { ok: true, message: "AI plan updated." };
}
