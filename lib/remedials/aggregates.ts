import "server-only";

import { prisma } from "@/lib/prisma";
import { PlatformFeatureKey } from "@prisma/client";
import { requirePublisherAdmin } from "@/lib/publisher-context";
import { requirePublisherFeature } from "@/lib/publisher-features";
import { requireSchool } from "@/lib/school-dashboard";

export async function getAuthenticatedSchoolRemedialAggregate() {
  const school = await requireSchool();
  if (!school.publisherId) return { assigned: 0, completed: 0, pending: 0, overdue: 0, bySubject: [] };
  await requirePublisherFeature(school.publisherId, PlatformFeatureKey.REMEDIALS);
  const year = await prisma.academicYear.findFirst({ where: { schoolId: school.id, current: true, active: true }, select: { id: true } });
  return year ? getSchoolRemedialAggregate(school.id, year.id) : { assigned: 0, completed: 0, pending: 0, overdue: 0, bySubject: [] };
}

export async function getAuthenticatedPublisherRemedialAggregate() {
  const { publisher } = await requirePublisherAdmin();
  await requirePublisherFeature(publisher.id, PlatformFeatureKey.REMEDIALS);
  return { publisher, resources: await getPublisherRemedialAggregate(publisher.id) };
}

export async function getSchoolRemedialAggregate(schoolId: string, academicYearId: string) {
  const plans = await prisma.remedialPlan.findMany({ where: { schoolId, academicYearId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { status: true, dueAt: true, gap: { select: { subject: { select: { name: true } } } }, steps: { select: { status: true } } } });
  const now = new Date();
  return { assigned: plans.length, completed: plans.filter((p) => p.status === "COMPLETED").length, pending: plans.filter((p) => p.status === "ACTIVE").length, overdue: plans.filter((p) => p.status === "ACTIVE" && p.dueAt < now).length, bySubject: count(plans.map((p) => p.gap.subject?.name ?? "General learning")) };
}

export async function getPublisherRemedialAggregate(publisherId: string) {
  const recommendations = await prisma.remedialRecommendation.findMany({ where: { plan: { publisherId, status: { in: ["ACTIVE", "COMPLETED"] } } }, select: { type: true, labelSnapshot: true, step: { select: { status: true } }, plan: { select: { gap: { select: { status: true } } } } } });
  const grouped = new Map<string, { label: string; assigned: number; completed: number; effective: number }>();
  for (const row of recommendations) { const key = `${row.type}:${row.labelSnapshot}`; const item = grouped.get(key) ?? { label: row.labelSnapshot, assigned: 0, completed: 0, effective: 0 }; item.assigned++; if (row.step?.status === "COMPLETED" || row.step?.status === "TEACHER_CLOSED") item.completed++; if (row.plan.gap.status === "RESOLVED") item.effective++; grouped.set(key, item); }
  return [...grouped.values()].map((item) => ({ ...item, completionRate: item.assigned ? Math.round(item.completed / item.assigned * 100) : null, effectivenessRate: item.completed ? Math.round(item.effective / item.completed * 100) : null })).sort((a, b) => b.assigned - a.assigned || a.label.localeCompare(b.label));
}

function count(labels: string[]) { const map = new Map<string, number>(); for (const label of labels) map.set(label, (map.get(label) ?? 0) + 1); return [...map].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); }
