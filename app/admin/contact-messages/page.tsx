import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Contact Messages | Bluegate Admin" };

export default async function ContactMessagesPage() {
  await requireLivePublisherAdmin();
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-slate-900">
      <h1 className="text-3xl font-bold">Contact messages unavailable</h1>
      <p className="mt-4 text-slate-700">
        Legacy contact messages do not have publisher ownership. Publisher Admin access is disabled until those records are assigned to a publisher by an approved migration.
      </p>
    </div>
  );
}
