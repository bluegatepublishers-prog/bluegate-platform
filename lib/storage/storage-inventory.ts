import "server-only";

import { prisma } from "@/lib/prisma";
import { scanStorageInventoryWithDatabase } from "./storage-inventory-core";

export function scanStorageInventory(publisherId: string) {
  return scanStorageInventoryWithDatabase(prisma, publisherId);
}

export async function getStorageActivityStatistics(publisherId: string) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const [uploadsToday, downloadsToday] = await Promise.all([
    prisma.securityAuditEvent.count({ where: { publisherId, action: "storage.upload.complete", outcome: "SUCCESS", createdAt: { gte: since } } }),
    prisma.securityAuditEvent.count({ where: { publisherId, action: "storage.download", outcome: "SUCCESS", createdAt: { gte: since } } }),
  ]);
  return { uploadsToday, downloadsToday };
}
