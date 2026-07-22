import Link from "next/link";
import type { ReactNode } from "react";

const tabs = [
  ["Overview", "/admin/storage"],
  ["Migration", "/admin/storage/migration"],
  ["Health", "/admin/storage/health"],
  ["Files", "/admin/storage/files"],
  ["Lifecycle", "/admin/storage/lifecycle"],
  ["Verification", "/admin/storage/verification"],
  ["Repairs", "/admin/storage/repairs"],
  ["Reports", "/admin/storage/reports"],
] as const;

export default function StorageLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold">Storage Management</h1><p className="mt-2 text-slate-600">Publisher-isolated R2 inventory, migration, verification, and reporting.</p></div>
    <nav aria-label="Storage sections" className="flex flex-wrap gap-2">{tabs.map(([label, href]) => <Link key={href} href={href} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">{label}</Link>)}</nav>
    {children}
  </div>;
}
