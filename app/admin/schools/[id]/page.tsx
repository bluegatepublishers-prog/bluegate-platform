import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileStack,
  MapPin,
  Settings2,
  ShieldCheck,
} from "lucide-react";

import SchoolFeatureManager from "@/components/admin/schools/SchoolFeatureManager";
import { getPlatformFeatureAvailability } from "@/lib/publisher-features";
import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
import {
  getSchoolFeatureDefinition,
  getSchoolFeatureDefinitionsByCategory,
  getSchoolFeatureState,
  type SchoolFeatureKey,
} from "@/lib/school-feature-entitlements";
import {
  SCHOOL_LIFECYCLE_TRANSITIONS,
  type SchoolLifecycleAction,
} from "@/lib/school-lifecycle";
import { getSchoolById } from "@/lib/schools";
import { prisma } from "@/lib/prisma";

import {
  changeSchoolLifecycleAction,
  updateSchoolAccessAction,
} from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "School Details | Bluegate Admin",
};

const lifecycleLabels: Record<SchoolLifecycleAction, string> = {
  approve: "Approve",
  reject: "Reject",
  pause: "Pause",
  resume: "Activate",
  suspend: "Suspend",
  revoke: "Revoke",
  archive: "Archive",
  restore: "Restore",
};

export default async function AdminSchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const school = await getSchoolById(id);

  if (!school) notFound();

  const subscription = school.accessSubscription ?? {
    plan: "FREE" as const,
    status: "SUSPENDED" as const,
    startsAt: null,
    expiresAt: null,
    notes: null,
    featureConfig: null,
  };

  const accessStatus = effectiveSchoolAccessStatus(subscription);
  const platformAvailability = await getPlatformFeatureAvailability();
  const featureState = getSchoolFeatureState(school.accessSubscription);
  const featureCategories = getSchoolFeatureDefinitionsByCategory();
  const canEditFeatures = Boolean(school.accessSubscription);

  const availableActions = Object.entries(SCHOOL_LIFECYCLE_TRANSITIONS)
    .filter(([, transition]) =>
      (transition.from as readonly string[]).includes(school.status),
    )
    .map(([action]) => action as SchoolLifecycleAction);

  const auditRows = school.accessSubscription
    ? await prisma.securityAuditEvent.findMany({
        where: {
          publisherId: school.publisherId,
          targetType: "SchoolAccessSubscription",
          targetId: school.accessSubscription.id,
          action: {
            in: [
              "publisher.school_feature.enable",
              "publisher.school_feature.disable",
            ],
          },
        },
        select: {
          id: true,
          action: true,
          actorUserId: true,
          createdAt: true,
          metadata: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  const actorIds = [
    ...new Set(
      auditRows
        .map((row) => row.actorUserId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      })
    : [];

  const actorById = new Map(
    actors.map((actor) => [actor.id, actor.name]),
  );

  const latestByFeature = new Map<
    string,
    { at: string; by: string | null }
  >();

  for (const row of auditRows) {
    const featureKey =
      typeof row.metadata === "object" &&
      row.metadata &&
      !Array.isArray(row.metadata) &&
      typeof row.metadata.featureKey === "string"
        ? row.metadata.featureKey
        : null;

    if (!featureKey || latestByFeature.has(featureKey)) continue;

    latestByFeature.set(featureKey, {
      at: row.createdAt.toISOString(),
      by: row.actorUserId
        ? actorById.get(row.actorUserId) ?? "System"
        : "System",
    });
  }

  const categories = featureCategories.map(
    ({ category, features }) => ({
      category,
      features: features.map((definition) => {
        const latest = latestByFeature.get(definition.key);

        return {
          key: definition.key,
          label: definition.label,
          platformAvailable: Boolean(
            platformAvailability[definition.publisherFeature],
          ),
          enabled: Boolean(featureState[definition.key]),
          lastModified:
            latest?.at ??
            school.accessSubscription?.updatedAt?.toISOString() ??
            null,
          modifiedBy: latest?.by ?? null,
        };
      }),
    }),
  );

  const audits = auditRows
    .map((row) => {
      const featureKey =
        typeof row.metadata === "object" &&
        row.metadata &&
        !Array.isArray(row.metadata) &&
        typeof row.metadata.featureKey === "string"
          ? row.metadata.featureKey
          : null;

      const definition = featureKey
        ? getSchoolFeatureDefinition(featureKey as SchoolFeatureKey)
        : null;

      return {
        id: row.id,
        featureLabel: definition?.label ?? featureKey ?? "Feature",
        action:
          row.action === "publisher.school_feature.enable"
            ? ("ENABLE" as const)
            : ("DISABLE" as const),
        at: row.createdAt.toISOString(),
        by: row.actorUserId
          ? actorById.get(row.actorUserId) ?? null
          : null,
      };
    })
    .filter(
      (row) =>
        row.featureLabel !== "Feature" || Boolean(row.at),
    );

  const enabledFeatureCount = categories.reduce(
    (sum, category) =>
      sum +
      category.features.filter((feature) => feature.enabled).length,
    0,
  );

  const totalFeatureCount = categories.reduce(
    (sum, category) => sum + category.features.length,
    0,
  );

  return (
    <main className="min-w-0 space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/admin/schools"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Schools
            </Link>

            <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-slate-950">
              {school.schoolName}
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
              <Badge value={school.status} />
              <Badge value={subscription.plan} />
              <Badge
                value={
                  accessStatus === "NOT_STARTED"
                    ? "Not started"
                    : accessStatus
                }
              />
              <span className="inline-flex items-center gap-1 text-slate-500">
                <MapPin className="h-3 w-3" />
                {[school.city, school.state].filter(Boolean).join(", ")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Link
              href={`/admin/schools/${school.id}/books`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Assign Books
            </Link>

            <Link
              href={`/admin/schools/${school.id}/resources`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileStack className="h-3.5 w-3.5" />
              Resources
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-3 xl:grid-cols-[1.35fr_1fr_0.8fr]">
        <Panel title="School Information" icon={Settings2}>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Info label="School" value={school.schoolName} />
            <Info
              label="Principal"
              value={school.principalName ?? "Not provided"}
            />
            <Info label="Email" value={school.user.email} />
            <Info
              label="Phone"
              value={school.user.phone ?? "Not provided"}
            />
            <Info
              label="Location"
              value={[school.city, school.state]
                .filter(Boolean)
                .join(", ")}
            />
            <Info
              label="Address"
              value={
                [school.address, school.pincode]
                  .filter(Boolean)
                  .join(" · ") || "Not provided"
              }
            />
          </div>
        </Panel>

        <Panel title="Subscription" icon={CalendarDays}>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Plan" value={subscription.plan} />
            <MiniStat
              label="Access"
              value={
                accessStatus === "NOT_STARTED"
                  ? "Not started"
                  : accessStatus
              }
            />
            <MiniStat
              label="Starts"
              value={formatDate(subscription.startsAt)}
            />
            <MiniStat
              label="Expires"
              value={formatDate(subscription.expiresAt)}
            />
          </div>
        </Panel>

        <Panel title="Usage" icon={CheckCircle2}>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat
              label="Books"
              value={String(school._count.bookEntitlements)}
            />
            <MiniStat
              label="Resources"
              value={String(school._count.resourceEntitlements)}
            />
            <MiniStat
              label="Features"
              value={`${enabledFeatureCount}/${totalFeatureCount}`}
            />
            <MiniStat label="Approval" value={school.status} />
          </div>
        </Panel>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-slate-950">
              Access & Lifecycle
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Set Free or Paid access, validity, and school lifecycle.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {availableActions.map((action) => (
              <form
                key={action}
                action={changeSchoolLifecycleAction.bind(
                  null,
                  school.id,
                )}
              >
                <input
                  type="hidden"
                  name="lifecycleAction"
                  value={action}
                />
                <button
                  type="submit"
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${
                    action === "suspend" ||
                    action === "revoke" ||
                    action === "reject"
                      ? "border border-rose-200 bg-rose-50 text-rose-700"
                      : action === "approve" || action === "resume"
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {lifecycleLabels[action]}
                </button>
              </form>
            ))}
          </div>
        </div>

        <form
          action={updateSchoolAccessAction.bind(null, school.id)}
          className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-[0.8fr_1fr_1fr_1fr_2fr_auto]"
        >
          <CompactField label="Plan">
            <select
              name="plan"
              defaultValue={subscription.plan}
              className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px]"
            >
              <option value="FREE">Free</option>
              <option value="PAID">Paid</option>
            </select>
          </CompactField>

          <CompactField label="Status">
            <select
              name="accessStatus"
              defaultValue={subscription.status}
              className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px]"
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </CompactField>

          <CompactField label="Starts">
            <input
              type="date"
              name="startsAt"
              defaultValue={dateInput(subscription.startsAt)}
              className="h-8 w-full rounded-lg border border-slate-200 px-2 text-[11px]"
            />
          </CompactField>

          <CompactField label="Expires">
            <input
              type="date"
              name="expiresAt"
              defaultValue={dateInput(subscription.expiresAt)}
              className="h-8 w-full rounded-lg border border-slate-200 px-2 text-[11px]"
            />
          </CompactField>

          <CompactField label="Internal note">
            <input
              name="notes"
              defaultValue={subscription.notes ?? ""}
              maxLength={500}
              placeholder="Optional note"
              className="h-8 w-full rounded-lg border border-slate-200 px-2 text-[11px]"
            />
          </CompactField>

          <button
            type="submit"
            className="self-end rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold text-white"
          >
            Save Access
          </button>
        </form>
      </section>

      <SchoolFeatureManager
        schoolId={school.id}
        plan={subscription.plan}
        categories={categories}
        audits={audits}
        canEdit={canEditFeatures}
      />

      <section className="grid gap-3 md:grid-cols-2">
        <Link
          href={`/admin/schools/${school.id}/books`}
          className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
        >
          <BookOpen className="h-4 w-4 text-blue-700" />
          <p className="mt-2 text-xs font-bold text-slate-900">
            Assigned Books
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {school._count.bookEntitlements} publisher books currently entitled.
          </p>
        </Link>

        <Link
          href={`/admin/schools/${school.id}/resources`}
          className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
        >
          <FileStack className="h-4 w-4 text-blue-700" />
          <p className="mt-2 text-xs font-bold text-slate-900">
            Resource Entitlements
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {school._count.resourceEntitlements} resources currently entitled.
          </p>
        </Link>
      </section>
    </main>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof ShieldCheck;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-700" />
        <h2 className="text-xs font-bold text-slate-950">
          {title}
        </h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 break-words text-[11px] font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-[11px] font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function CompactField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Badge({ value }: { value: string }) {
  const normalized = value.toUpperCase();

  const tone =
    normalized === "PAID" ||
    normalized === "ACTIVE" ||
    normalized === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "FREE"
        ? "bg-blue-50 text-blue-700"
        : normalized === "SUSPENDED"
          ? "bg-amber-50 text-amber-700"
          : normalized === "EXPIRED"
            ? "bg-rose-50 text-rose-700"
            : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-2 py-0.5 font-bold ${tone}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

function formatDate(value: Date | null) {
  if (!value) return "Not set";

  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}