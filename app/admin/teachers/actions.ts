"use server";

import { SecurityAuditOutcome, TeacherAiPlan } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminTeacherOwnership } from "@/lib/publisher-admin-data";
import { publisherAdminAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";

export async function updateTeacherAiPlan(teacherId: string, formData: FormData) {
  const actor = await requirePublisherAdminTeacherOwnership(teacherId);
  const raw = String(formData.get("aiPlan") ?? "");
  const plan = raw === "PREMIUM" ? TeacherAiPlan.PREMIUM : TeacherAiPlan.STANDARD;
  const expiryRaw = String(formData.get("aiPlanExpiresAt") ?? "").trim();
  const expiry = expiryRaw ? new Date(`${expiryRaw}T23:59:59+05:30`) : null;
  if (expiry && Number.isNaN(expiry.getTime())) return { ok: false, message: "Invalid expiry date." };
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.teacher.updateMany({
      where: { id: teacherId, school: { publisherId: actor.publisherId } },
      data: { aiPlan: plan, aiDailyLimit: plan === TeacherAiPlan.PREMIUM ? 5 : 0, aiPlanExpiresAt: expiry },
    });
    if (result.count !== 1) return null;
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor(actor), action: "publisher.teacher.ai_plan.set",
      targetType: "Teacher", targetId: teacherId, outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { plan },
    });
    return result;
  });
  if (!updated) return { ok: false, message: "Unable to update this teacher." };
  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${teacherId}`);
  revalidatePath("/teacher-dashboard/ai");
  return { ok: true, message: "AI plan updated." };
}
