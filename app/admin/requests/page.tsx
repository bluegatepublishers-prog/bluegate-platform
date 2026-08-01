import Link from "next/link";
import { ClipboardCheck, Mail, School } from "lucide-react";

import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Requests | Bluegate Admin" };

export default async function AdminRequestsPage() {
  const actor = await requireLivePublisherAdmin();
  const [schoolApprovals, inspectionNew, inspectionTotal] = await Promise.all([
    prisma.school.count({ where: { publisherId: actor.publisherId, status: "PENDING" } }),
    prisma.inspectionRequest.count({ where: { publisherId: actor.publisherId, status: "NEW" } }),
    prisma.inspectionRequest.count({ where: { publisherId: actor.publisherId } }),
  ]);

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Publisher operations
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Requests</h1>
        <p className="mt-2 text-slate-600">
          Review onboarding and inspection queues with publisher-scoped controls.
        </p>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/admin/school-requests" className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-300">
          <span className="inline-flex rounded-xl bg-blue-100 p-3 text-blue-700">
            <School className="h-5 w-5" />
          </span>
          <p className="mt-4 text-3xl font-bold text-slate-900">{schoolApprovals}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">School approvals</h2>
          <p className="mt-1 text-sm text-slate-600">Pending schools waiting for approval actions.</p>
        </Link>

        <Link href="/admin/inspection-requests" className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-300">
          <span className="inline-flex rounded-xl bg-blue-100 p-3 text-blue-700">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <p className="mt-4 text-3xl font-bold text-slate-900">{inspectionNew}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">New inspection requests</h2>
          <p className="mt-1 text-sm text-slate-600">{inspectionTotal} total inspection requests for this publisher.</p>
        </Link>

        <Link href="/admin/contact-messages" className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-300">
          <span className="inline-flex rounded-xl bg-blue-100 p-3 text-blue-700">
            <Mail className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Read-only status</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Contact messages</h2>
          <p className="mt-1 text-sm text-slate-600">Legacy contact records remain disabled until publisher ownership migration is complete.</p>
        </Link>
      </section>
    </main>
  );
}
