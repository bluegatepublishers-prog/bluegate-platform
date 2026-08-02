import { notFound } from "next/navigation";

import GuardianInvitationForm from "@/components/onboarding/GuardianInvitationForm";
import { resolveFeaturesForAuthenticatedUser } from "@/lib/publisher-features";
import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";
import { isSchoolFeatureEnabled } from "@/lib/school-feature-entitlements";

import { inviteGuardianAction, primaryRelationshipAction, relationshipAction } from "./actions";

export default async function GuardiansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const school = await requireSchool();
  const features = await resolveFeaturesForAuthenticatedUser();
  const subscription = await prisma.schoolAccessSubscription.findUnique({
    where: { schoolId: school.id },
    select: { featureConfig: true },
  });
  const student = await prisma.student.findFirst({
    where: { id, schoolId: school.id },
    include: {
      parentRelationships: {
        include: {
          parent: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { requestedAt: "desc" },
      },
      parentInvitations: {
        where: { usedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) notFound();

  const invite = inviteGuardianAction.bind(null, id);
  const parentPortalEnabled = Boolean(features.PARENT_PORTAL);
  const parentPortalEnabledAtSchool = isSchoolFeatureEnabled(subscription, "PARENT_PORTAL");

  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="font-bold text-blue-700">School-controlled guardian access</p>
        <h1 className="mt-2 text-3xl font-bold">{student.name}: parents and guardians</h1>
        <p className="mt-2 text-slate-600">Invitations create a pending relationship. Review it separately before learning information becomes visible.</p>
      </header>

      {!parentPortalEnabled ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="font-bold">This feature has been disabled by your publisher.</h2>
          <p className="mt-2 text-sm">
            You can review existing relationship history, but new parent invitations remain blocked until the publisher enables the feature.
          </p>
        </section>
      ) : !parentPortalEnabledAtSchool ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="font-bold">This feature has been disabled by your publisher.</h2>
          <p className="mt-2 text-sm">
            You can review existing relationship history, but new parent invitations remain blocked until this school re-enables the feature.
          </p>
        </section>
      ) : (
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Invite parent / guardian</h2>
          <div className="mt-5">
            <GuardianInvitationForm action={invite} />
          </div>
        </section>
      )}

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Relationship history</h2>
        <div className="mt-5 space-y-4">
          {student.parentRelationships.length === 0 ? (
            <p className="text-slate-600">No relationships yet.</p>
          ) : (
            student.parentRelationships.map((relationship) => (
              <article key={relationship.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong>{relationship.parent.user.name}</strong>
                    <p className="text-sm text-slate-600">
                      {relationship.relationshipType.toLowerCase()} · {relationship.status.toLowerCase()} · {relationship.parent.user.email}
                    </p>
                    {relationship.primaryContact ? <p className="mt-1 text-sm font-semibold text-blue-700">Primary contact</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {relationship.status === "PENDING" ? (
                      <>
                        <form action={relationshipAction.bind(null, id, relationship.id, "APPROVE")}>
                          <button className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white">Approve</button>
                        </form>
                        <form action={relationshipAction.bind(null, id, relationship.id, "REJECT")}>
                          <button className="rounded-lg border px-3 py-2 text-sm font-bold">Reject</button>
                        </form>
                      </>
                    ) : null}
                    {relationship.status === "APPROVED" ? (
                      <>
                        <form action={primaryRelationshipAction.bind(null, id, relationship.id)}>
                          <button className="rounded-lg border px-3 py-2 text-sm font-bold">Make primary</button>
                        </form>
                        <form action={relationshipAction.bind(null, id, relationship.id, "REVOKE")}>
                          <button className="rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white">Revoke</button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Unused invitations</h2>
        <p className="mt-3 text-slate-600">
          {student.parentInvitations.length
            ? `${student.parentInvitations.length} unused invitation record(s). Creating a replacement revokes earlier unused codes for the same student and email.`
            : "No unused invitations."}
        </p>
      </section>
    </main>
  );
}
