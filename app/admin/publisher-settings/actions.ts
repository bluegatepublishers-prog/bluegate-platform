"use server";

import { SecurityAuditOutcome } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { brandingData } from "@/lib/publisher-branding-validation";
import { requirePublisherAdmin } from "@/lib/publisher-context";
import { publisherAdminAuditActor, runAuditedMutation } from "@/lib/security-audit";

export async function updateOwnBranding(form: FormData) {
  const { actor, publisher } = await requirePublisherAdmin();
  const data = brandingData(form);
  await runAuditedMutation({
    actor: publisherAdminAuditActor(actor),
    action: "publisher.settings.update",
    targetType: "Publisher",
    targetId: publisher.id,
    outcome: SecurityAuditOutcome.SUCCESS,
    metadata: { changedFields: Object.keys(data) },
  }, (tx) => tx.publisher.update({ where: { id: publisher.id }, data }));
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/publisher-settings");
}
