import "server-only";

import { SecurityAuditOutcome } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publisherAdminAuditActor, recordTrustedAuditBestEffort, writeSecurityAuditEvent } from "@/lib/security-audit";
import type { TrustedPublisherAdminActor } from "@/lib/publisher-admin-policy";
import { scanStorageInventory } from "./storage-inventory";
import { getStorageProvider } from "./provider";
import { verifyObject, verifyPublisher } from "./verification";
import { planRepair, applyRepair, type StorageRepairPlan } from "./repair";
import { listPublisherStorageObjects } from "./storage-health-runtime";
import { generateReconciliationReport } from "./reconciliation";
import { generateLifecycleReports } from "./lifecycle-reports";

export async function verifyPublisherStorage(actor: TrustedPublisherAdminActor, options: { offset?: number; limit?: number } = {}) {
  const files = await scanStorageInventory(actor.publisherId);
  const report = await verifyPublisher(files, getStorageProvider(), options);
  await recordTrustedAuditBestEffort({ actor: publisherAdminAuditActor(actor), action: "storage.verify", targetType: "Storage", outcome: report.results.every(result => result.verified) ? SecurityAuditOutcome.SUCCESS : SecurityAuditOutcome.FAILURE, reasonCode: report.results.every(result => result.verified) ? undefined : "INVALID_STATE", metadata: { scope: "publisher", fileCount: report.checked, mismatchCount: report.results.reduce((sum, result) => sum + result.mismatches.length, 0) } });
  return report;
}

export async function verifyPublisherStorageFile(actor: TrustedPublisherAdminActor, fileId: string) {
  const file = (await scanStorageInventory(actor.publisherId)).find(item => item.id === fileId);
  if (!file) return null;
  const result = await verifyObject(file, getStorageProvider());
  await recordTrustedAuditBestEffort({ actor: publisherAdminAuditActor(actor), action: "storage.verify", targetType: "Storage", targetId: file.entityId, outcome: result.verified ? SecurityAuditOutcome.SUCCESS : SecurityAuditOutcome.FAILURE, reasonCode: result.verified ? undefined : result.exists ? "INVALID_STATE" : "TARGET_NOT_FOUND", metadata: { scope: "file", verified: result.verified, mismatchCount: result.mismatches.length } });
  return { file, result };
}

export async function repairPublisherStorageFile(actor: TrustedPublisherAdminActor, fileId: string) {
  const verified = await verifyPublisherStorageFile(actor, fileId);
  if (!verified) return null;
  const plan = planRepair(verified.file, verified.result);
  const outcome = await applyRepair(plan, {
    async compareAndSwapProviderMetadata(repairPlan) {
      if (!repairPlan.changes.providerMetadata || !repairPlan.expectedETag) return false;
      await getStorageProvider().replaceObjectMetadata({ key: repairPlan.expectedValue, expectedETag: repairPlan.expectedETag, contentType: repairPlan.contentType, customMetadata: repairPlan.changes.providerMetadata });
      return true;
    },
    async compareAndSwap(repairPlan: StorageRepairPlan) {
      if (repairPlan.entityType !== "Resource") return null;
      return prisma.$transaction(async tx => {
        const data: { mimeType?: string; fileSizeBytes?: bigint; originalFileName?: string } = {};
        if (repairPlan.changes.mimeType) data.mimeType = repairPlan.changes.mimeType;
        if (repairPlan.changes.sizeBytes !== undefined) data.fileSizeBytes = BigInt(repairPlan.changes.sizeBytes);
        if (repairPlan.changes.filename) data.originalFileName = repairPlan.changes.filename;
        const update = await tx.resource.updateMany({ where: { id: repairPlan.entityId, publisherId: actor.publisherId, fileUrl: repairPlan.expectedValue }, data });
        if (update.count !== 1) return null;
        await writeSecurityAuditEvent(tx, { actor: publisherAdminAuditActor(actor), action: "storage.repair", targetType: "Resource", targetId: repairPlan.entityId, outcome: SecurityAuditOutcome.SUCCESS, metadata: { scope: "file", repairCount: Object.keys(data).length } });
        return update.count;
      });
    },
    async audit({ applied }) {
      if (!applied) await recordTrustedAuditBestEffort({ actor: publisherAdminAuditActor(actor), action: "storage.repair", targetType: "Storage", outcome: SecurityAuditOutcome.FAILURE, reasonCode: plan.applicable ? "INVALID_STATE" : "VALIDATION_FAILED", metadata: { scope: "file", repairCount: 0 } });
    },
  });
  return { plan, outcome };
}

export async function getPublisherReconciliationReport(actor: TrustedPublisherAdminActor, maximumObjects = 5_000) {
  const [files, objects, audits] = await Promise.all([
    scanStorageInventory(actor.publisherId),
    listPublisherStorageObjects(actor.publisherId, maximumObjects),
    prisma.securityAuditEvent.findMany({ where: { publisherId: actor.publisherId, action: { in: ["storage.upload.init", "storage.upload.complete"] } }, orderBy: { createdAt: "desc" }, take: 2_000, select: { id: true, actorUserId: true, action: true, createdAt: true, metadata: true } }),
  ]);
  const report = generateReconciliationReport(files, objects, audits);
  await recordTrustedAuditBestEffort({ actor: publisherAdminAuditActor(actor), action: "storage.reconciliation.scan", targetType: "Storage", outcome: SecurityAuditOutcome.SUCCESS, metadata: { scope: "publisher", fileCount: files.length, mismatchCount: report.issues.length } });
  return report;
}

export async function getPublisherLifecycleReport(publisherId: string) {
  const [files, audits] = await Promise.all([
    scanStorageInventory(publisherId),
    prisma.securityAuditEvent.findMany({ where: { publisherId, action: { in: ["storage.download", "storage.repair"] } }, orderBy: { createdAt: "desc" }, take: 10_000, select: { action: true, targetId: true, createdAt: true, outcome: true } }),
  ]);
  return generateLifecycleReports(files, audits);
}
