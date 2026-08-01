import Link from "next/link";
import { BookOpen, ClipboardCheck, FolderOpen, QrCode, School } from "lucide-react";

import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const actor = await requireLivePublisherAdmin();
  const publisherId = actor.publisherId;
  const [pendingSchools, activeSchools, freeSchools, paidSchools, books, resources, qrCodes, inspectionRequests, recentPending, recentBooks, recentInspections] = await Promise.all([
    prisma.school.count({ where: { publisherId, status: "PENDING" } }),
    prisma.schoolAccessSubscription.count({ where: { publisherId, status: "ACTIVE", AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }] } }),
    prisma.schoolAccessSubscription.count({ where: { publisherId, plan: "FREE" } }),
    prisma.schoolAccessSubscription.count({ where: { publisherId, plan: "PAID" } }),
    prisma.book.count({ where: { publisherId } }),
    prisma.resource.count({ where: { publisherId } }),
    prisma.dynamicQrCode.count({ where: { publisherId } }),
    prisma.inspectionRequest.count({ where: { publisherId, status: "NEW" } }),
    prisma.school.findMany({ where: { publisherId, status: "PENDING" }, select: { id: true, schoolName: true, city: true, state: true }, orderBy: { schoolName: "asc" }, take: 5 }),
    prisma.book.findMany({ where: { publisherId }, select: { id: true, title: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.inspectionRequest.findMany({ where: { publisherId }, select: { id: true, schoolName: true, bookTitle: true, status: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 5 }),
  ]);

  const stats = [
    ["Pending School Approvals", pendingSchools, School, "/admin/schools?view=pending"],
    ["Active Schools", activeSchools, School, "/admin/schools?view=active"],
    ["Free Schools", freeSchools, School, "/admin/schools?plan=FREE"],
    ["Paid Schools", paidSchools, School, "/admin/schools?plan=PAID"],
    ["Books", books, BookOpen, "/admin/books"],
    ["Resources", resources, FolderOpen, "/admin/resources"],
    ["QR Codes", qrCodes, QrCode, "/admin/qr"],
    ["Inspection Requests", inspectionRequests, ClipboardCheck, "/admin/inspection-requests"],
  ] as const;

  return <main className="space-y-8">
    <header><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Publisher workspace</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Dashboard</h1><p className="mt-2 text-slate-600">Approve schools and manage publisher content access.</p></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([title, value, Icon, href]) => <Link key={title} href={href} className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-300"><Icon className="h-6 w-6 text-blue-700"/><p className="mt-4 text-3xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-600">{title}</p></Link>)}</section>
    <section className="grid gap-6 xl:grid-cols-3">
      <DashboardList title="Pending approvals" href="/admin/schools?view=pending" empty="No pending school approvals.">{recentPending.map((school) => <Link key={school.id} href={`/admin/schools/${school.id}`} className="block py-3"><strong className="block">{school.schoolName}</strong><span className="text-sm text-slate-500">{school.city}, {school.state}</span></Link>)}</DashboardList>
      <DashboardList title="Recently updated Books" href="/admin/books" empty="No Books available.">{recentBooks.map((book) => <Link key={book.id} href={`/admin/books/${book.id}/content`} className="flex justify-between gap-3 py-3"><strong>{book.title}</strong><span className="shrink-0 text-xs text-slate-500">{book.updatedAt.toLocaleDateString("en-IN")}</span></Link>)}</DashboardList>
      <DashboardList title="Recent inspection requests" href="/admin/inspection-requests" empty="No inspection requests.">{recentInspections.map((request) => <Link key={request.id} href={`/admin/inspection-requests/${request.id}`} className="block py-3"><strong className="block">{request.schoolName}</strong><span className="text-sm text-slate-500">{request.bookTitle} · {request.status}</span></Link>)}</DashboardList>
    </section>
  </main>;
}

function DashboardList({ title, href, empty, children }: { title: string; href: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="rounded-2xl border bg-white p-5 shadow-sm"><header className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{title}</h2><Link href={href} className="text-sm font-semibold text-blue-700">View all</Link></header><div className="mt-3 divide-y">{hasChildren ? children : <p className="py-6 text-sm text-slate-500">{empty}</p>}</div></section>;
}
