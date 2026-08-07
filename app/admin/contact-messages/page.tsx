import Link from "next/link";
import {
  ArrowLeft,
  LockKeyhole,
  Mail,
} from "lucide-react";

import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title:
    "Contact Messages | Bluegate Admin",
};

export default async function ContactMessagesPage() {
  await requireLivePublisherAdmin();

  return (
    <main className="min-w-0 space-y-4">
      <header>
        <Link
          href="/admin/requests"
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Requests
        </Link>

        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
          Request Management
        </p>

        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          Contact Messages
        </h1>

        <p className="mt-0.5 text-xs text-slate-500">
          Publisher access to legacy contact records is currently restricted.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white">
        <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200">
            <LockKeyhole className="h-4 w-4" />
          </span>

          <div>
            <h2 className="text-xs font-bold text-slate-900">
              Read-only status
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-600">
              Contact-message access is disabled for Publisher Admin.
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-[42px_1fr]">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
            <Mail className="h-4 w-4" />
          </span>

          <div>
            <p className="text-[11px] font-semibold text-slate-800">
              Legacy contact messages do not currently contain publisher ownership.
            </p>

            <p className="mt-1 max-w-3xl text-[10px] leading-5 text-slate-500">
              Publisher Admin access will remain disabled until those records are assigned to a publisher through an approved ownership migration. No message data is being exposed or modified from this screen.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
