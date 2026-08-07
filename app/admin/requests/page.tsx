import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Mail,
  School,
} from "lucide-react";

import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Requests | Bluegate Admin",
};

export default async function AdminRequestsPage() {
  const actor =
    await requireLivePublisherAdmin();

  const [
    schoolApprovals,
    inspectionNew,
    inspectionTotal,
  ] = await Promise.all([
    prisma.school.count({
      where: {
        publisherId:
          actor.publisherId,
        status: "PENDING",
      },
    }),

    prisma.inspectionRequest.count({
      where: {
        publisherId:
          actor.publisherId,
        status: "NEW",
      },
    }),

    prisma.inspectionRequest.count({
      where: {
        publisherId:
          actor.publisherId,
      },
    }),
  ]);

  const items = [
    {
      title: "School Approvals",
      description:
        "Review schools waiting for publisher approval.",
      href: "/admin/school-requests",
      icon: School,
      value: schoolApprovals,
      meta: "Pending",
    },
    {
      title: "Inspection Requests",
      description:
        "Review inspection-copy requests submitted for books.",
      href: "/admin/inspection-requests",
      icon: ClipboardCheck,
      value: inspectionNew,
      meta: `${inspectionTotal} total`,
    },
    {
      title: "Contact Messages",
      description:
        "Legacy contact messages remain read-only until ownership migration.",
      href: "/admin/contact-messages",
      icon: Mail,
      value: null,
      meta: "Read only",
    },
  ] as const;

  return (
    <main className="min-w-0 space-y-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
          Publisher Operations
        </p>

        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          Requests
        </h1>

        <p className="mt-0.5 text-xs text-slate-500">
          Review onboarding, inspection and contact queues.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <h2 className="text-xs font-bold text-slate-900">
            Request Workspaces
          </h2>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Open a queue to review records and take action.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group grid min-h-[72px] grid-cols-[38px_minmax(0,1fr)_auto_28px] items-center gap-3 px-4 py-3 transition hover:bg-blue-50/30"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {item.description}
                  </p>
                </div>

                <div className="text-right">
                  {item.value !== null ? (
                    <p className="text-lg font-bold text-slate-950">
                      {item.value}
                    </p>
                  ) : null}

                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {item.meta}
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
