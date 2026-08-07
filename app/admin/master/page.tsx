import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  GraduationCap,
  Landmark,
  LibraryBig,
  Plus,
  Settings2,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export const metadata = {
  title: "Master Data | Bluegate Admin",
};

export default async function MasterDataPage() {
  const actor = await requireLivePublisherAdmin();

  const [classes, subjects, series, boards, definitions] =
    await Promise.all([
      prisma.class.count({
        where: { active: true },
      }),

      prisma.subject.count({
        where: { active: true },
      }),

      prisma.bookSeries.count({
        where: {
          active: true,
          publisherId: actor.publisherId,
        },
      }),

      prisma.board.count({
        where: {
          active: true,
          publisherId: actor.publisherId,
        },
      }),

      prisma.masterDataDefinition.findMany({
        where: {
          publisherId: actor.publisherId,
        },
        include: {
          _count: {
            select: {
              values: {
                where: {
                  active: true,
                },
              },
            },
          },
        },
        orderBy: [
          { displayOrder: "asc" },
          { name: "asc" },
        ],
      }),
    ]);

  const core = [
    {
      title: "Boards",
      description:
        "Boards and curricula available for publisher books.",
      href: "/admin/master/boards",
      icon: Landmark,
      count: boards,
    },
    {
      title: "Classes",
      description:
        "Class levels used for books, schools and learning content.",
      href: "/admin/master/classes",
      icon: GraduationCap,
      count: classes,
    },
    {
      title: "Subjects",
      description:
        "Subjects used for books and educational content.",
      href: "/admin/master/subjects",
      icon: BookOpen,
      count: subjects,
    },
    {
      title: "Book Series",
      description:
        "Publication series used to organise publisher books.",
      href: "/admin/master/series",
      icon: LibraryBig,
      count: series,
    },
  ];

  return (
    <main className="min-w-0 space-y-5">
      {/* PAGE HEADER */}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
            Content Studio
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Master Data
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Manage the reference data used across books,
            schools and publisher content.
          </p>
        </div>

        <Link
          href="/admin/master/custom"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Custom List
        </Link>
      </header>

      {/* CORE MASTER DATA */}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Core Master Data
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-500">
              Primary reference data used throughout the
              platform.
            </p>
          </div>

          <Settings2 className="h-4 w-4 text-slate-400" />
        </div>

        <div className="divide-y divide-slate-100">
          {core.map((item) => (
            <CoreRow
              key={item.href}
              {...item}
            />
          ))}
        </div>
      </section>

      {/* CUSTOM MASTER DATA */}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Custom Master Data
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-500">
              Publisher-defined lists for additional
              classification and configuration.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            {definitions.length}{" "}
            {definitions.length === 1
              ? "list"
              : "lists"}
          </span>
        </div>

        {definitions.length ? (
          <>
            {/* TABLE HEADER */}

            <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(180px,1fr)_100px_100px_36px] gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 md:grid">
              <span>List</span>
              <span>Code</span>
              <span>Values</span>
              <span>Status</span>
              <span />
            </div>

            {/* CUSTOM LIST ROWS */}

            <div className="divide-y divide-slate-100">
              {definitions.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/master/custom/${item.id}`}
                  className="group grid gap-3 px-5 py-3 transition hover:bg-blue-50/40 md:grid-cols-[minmax(220px,1.5fr)_minmax(180px,1fr)_100px_100px_36px] md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Boxes className="h-4 w-4" />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.name}
                      </p>

                      {item.description ? (
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <p className="truncate text-xs text-slate-500">
                    {item.code}
                  </p>

                  <div>
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
                      {item._count.values} active
                    </span>
                  </div>

                  <div>
                    <span
                      className={
                        item.active
                          ? "inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                          : "inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500"
                      }
                    >
                      {item.active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>

                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Boxes className="h-5 w-5" />
            </span>

            <h3 className="mt-3 text-sm font-bold text-slate-800">
              No custom lists
            </h3>

            <p className="mt-1 max-w-md text-xs text-slate-500">
              Create publisher-specific lists only when the
              standard master data does not cover your need.
            </p>

            <Link
              href="/admin/master/custom"
              className="mt-4 inline-flex h-8 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Manage Custom Types
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

/* -------------------------------------------------------
   CORE MASTER DATA ROW
------------------------------------------------------- */

function CoreRow({
  title,
  description,
  href,
  icon: Icon,
  count,
}: {
  title: string;
  description: string;
  href: string;
  icon: typeof Boxes;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="group grid min-h-[68px] grid-cols-[36px_minmax(0,1fr)_auto_28px] items-center gap-3 px-5 py-3 transition hover:bg-blue-50/40"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
        <Icon className="h-[18px] w-[18px]" />
      </span>

      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {description}
        </p>
      </div>

      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
        {count} active
      </span>

      <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
    </Link>
  );
}