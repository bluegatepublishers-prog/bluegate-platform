import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Database,
  Plus,
  QrCode,
  School,
  Sparkles,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const actor =
    await requireLivePublisherAdmin();

  const publisherId = actor.publisherId;
  const now = new Date();

  const [
    pendingSchools,
    activeSchools,
    totalBooks,
    publishedBooks,
    inspectionRequests,
    recentPending,
    recentBooks,
  ] = await Promise.all([
    prisma.school.count({
      where: {
        publisherId,
        status: "PENDING",
      },
    }),
    prisma.schoolAccessSubscription.count({
      where: {
        publisherId,
        status: "ACTIVE",
        AND: [
          {
            OR: [
              { startsAt: null },
              { startsAt: { lte: now } },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
        ],
      },
    }),
    prisma.book.count({
      where: { publisherId },
    }),
    prisma.book.count({
      where: {
        publisherId,
        published: true,
        archived: false,
      },
    }),
    prisma.inspectionRequest.count({
      where: {
        publisherId,
        status: "NEW",
      },
    }),
    prisma.school.findMany({
      where: {
        publisherId,
        status: "PENDING",
      },
      select: {
        id: true,
        schoolName: true,
        city: true,
        state: true,
      },
      orderBy: {
        schoolName: "asc",
      },
      take: 4,
    }),
    prisma.book.findMany({
      where: { publisherId },
      select: {
        id: true,
        title: true,
        published: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
    }),
  ]);

  const draftBooks =
    totalBooks - publishedBooks;

  return (
    <main className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
            Publisher Workspace
          </p>

          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Command Center
          </h1>

          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
            Continue production, manage schools
            and review pending work.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/books/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Book
            </Link>

            <Link
              href="/admin/books"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Content Studio
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <QuickTool
            href="/admin/reports"
            label="Reports"
            detail="Learning analytics"
            icon={BarChart3}
          />
          <QuickTool
            href="/admin/master"
            label="Master Data"
            detail="Classes & subjects"
            icon={Database}
          />
          <QuickTool
            href="/admin/qr"
            label="QR Center"
            detail="Book redirects"
            icon={QrCode}
          />
          <QuickTool
            href="/admin/requests"
            label="Requests"
            detail="Review queues"
            icon={ClipboardCheck}
          />
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          title="Active Schools"
          value={activeSchools}
          note={`${pendingSchools} pending`}
          href="/admin/schools"
          icon={School}
        />

        <Metric
          title="Books"
          value={totalBooks}
          note={`${publishedBooks} live · ${draftBooks} draft`}
          href="/admin/books"
          icon={BookOpen}
        />

        <Metric
          title="Pending Schools"
          value={pendingSchools}
          note="Approval queue"
          href="/admin/school-requests"
          icon={School}
        />

        <Metric
          title="Inspections"
          value={inspectionRequests}
          note="New requests"
          href="/admin/inspection-requests"
          icon={ClipboardCheck}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Recently updated books"
          href="/admin/books"
        >
          {recentBooks.length ? (
            recentBooks.map((book) => (
              <Link
                key={book.id}
                href={`/admin/books/${book.id}/content`}
                className="flex items-center justify-between gap-3 border-t border-slate-100 py-2.5 first:border-t-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">
                    {book.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {book.published
                      ? "Published"
                      : "Draft"}{" "}
                    ·{" "}
                    {book.updatedAt.toLocaleDateString(
                      "en-IN",
                    )}
                  </p>
                </div>

                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
              </Link>
            ))
          ) : (
            <Empty text="No books yet." />
          )}
        </Panel>

        <Panel
          title="School approvals"
          href="/admin/school-requests"
        >
          {recentPending.length ? (
            recentPending.map((school) => (
              <Link
                key={school.id}
                href={`/admin/schools/${school.id}`}
                className="block border-t border-slate-100 py-2.5 first:border-t-0"
              >
                <p className="truncate text-xs font-semibold text-slate-900">
                  {school.schoolName}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {[school.city, school.state]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </Link>
            ))
          ) : (
            <Empty text="No pending approvals." />
          )}
        </Panel>
      </section>
    </main>
  );
}

function QuickTool({
  href,
  label,
  detail,
  icon: Icon,
}: {
  href: string;
  label: string;
  detail: string;
  icon: typeof BarChart3;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/30"
    >
      <Icon className="h-4 w-4 text-blue-700" />
      <p className="mt-2 text-xs font-bold text-slate-900">
        {label}
      </p>
      <p className="mt-0.5 text-[10px] text-slate-500">
        {detail}
      </p>
    </Link>
  );
}

function Metric({
  title,
  value,
  note,
  href,
  icon: Icon,
}: {
  title: string;
  value: number;
  note: string;
  href: string;
  icon: typeof School;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-blue-200"
    >
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-blue-700" />
        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-0.5 text-xs font-semibold text-slate-800">
        {title}
      </p>

      <p className="mt-0.5 text-[10px] text-slate-500">
        {note}
      </p>
    </Link>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold text-slate-900">
          {title}
        </h2>
        <Link
          href={href}
          className="text-[10px] font-semibold text-blue-700"
        >
          View all
        </Link>
      </header>
      <div className="mt-2">
        {children}
      </div>
    </section>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <p className="py-5 text-[11px] text-slate-400">
      {text}
    </p>
  );
}
