import Link from "next/link";
import { requireSuperAdmin } from "@/lib/publisher-context";
import PublisherCreateForm from "@/components/super-admin/PublisherCreateForm";

export default async function NewPublisherPage() {
  await requireSuperAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/super-admin/publishers" className="text-sm font-bold text-blue-700">← Back to Publishers</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Platform administration</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Add Publisher</h1>
        <p className="mt-2 text-slate-600">Create a new publisher tenant for Edora Learning Pvt Ltd.</p>
      </div>
      <PublisherCreateForm />
    </div>
  );
}
