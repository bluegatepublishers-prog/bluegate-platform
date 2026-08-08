import Link from "next/link";
import { BookOpen, Database, FolderOpen, QrCode } from "lucide-react";

import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Library | Bluegate Admin" };

export default async function AdminLibraryPage() {
  const actor = await requireLivePublisherAdmin();
  const [books, resources, qrCodes, boards, series] = await Promise.all([
    prisma.book.count({ where: { publisherId: actor.publisherId, archived: false } }),
    prisma.resource.count({ where: { publisherId: actor.publisherId, archived: false } }),
    prisma.dynamicQrCode.count({ where: { publisherId: actor.publisherId } }),
    prisma.board.count({ where: { publisherId: actor.publisherId, active: true } }),
    prisma.bookSeries.count({ where: { publisherId: actor.publisherId, active: true } }),
  ]);

  const cards = [
    {
      title: "Books",
      description: "Manage catalog and open Content Studio.",
      count: books,
      href: "/admin/books",
      icon: BookOpen,
    },
    {
      title: "Resources",
      description: "Upload once and attach across books and schools.",
      count: resources,
      href: "/admin/resources",
      icon: FolderOpen,
    },
    {
      title: "QR Manager",
      description: "Permanent QR workspace for printed books.",
      count: qrCodes,
      href: "/admin/qr",
      icon: QrCode,
    },
    {
      title: "Master Data",
      description: "Boards, classes, subjects, and custom lists.",
      count: boards + series,
      href: "/admin/master",
      icon: Database,
    },
  ] as const;

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Publisher content
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Library</h1>
        <p className="mt-2 text-slate-600">
          Books, resources, QR delivery, and master data in one workspace.
        </p>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-300"
            >
              <span className="inline-flex rounded-xl bg-blue-100 p-3 text-blue-700">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-3xl font-bold text-slate-900">{card.count}</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{card.description}</p>
              <p className="mt-4 text-sm font-semibold text-blue-700">Open workspace</p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
