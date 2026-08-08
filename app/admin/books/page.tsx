import Link from "next/link";
import {
  Database,
  Plus,
  Search,
} from "lucide-react";

import BookTable from "@/components/admin/books/BookTable";
import { prisma } from "@/lib/prisma";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { bookCoverPath } from "@/lib/storage/book-asset-path";
import type { BookTableItem } from "@/types/admin-book";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Content Studio | Bluegate Admin",
};

const PAGE_SIZE = 10;

type Filters = {
  q?: string;
  classId?: string;
  subjectId?: string;
  boardId?: string;
  seriesId?: string;
  status?: string;
  page?: string;
};

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const actor =
    await requireLivePublisherAdmin();

  const filters = await searchParams;
  const requestedPage =
    normalizePage(filters.page);

  const where = {
    publisherId: actor.publisherId,
    ...(filters.q?.trim()
      ? {
          OR: [
            {
              title: {
                contains:
                  filters.q.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              author: {
                contains:
                  filters.q.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              isbn: {
                contains:
                  filters.q.trim(),
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(filters.classId
      ? { classId: filters.classId }
      : {}),
    ...(filters.subjectId
      ? { subjectId: filters.subjectId }
      : {}),
    ...(filters.boardId
      ? { boardId: filters.boardId }
      : {}),
    ...(filters.seriesId
      ? { seriesId: filters.seriesId }
      : {}),
    ...(filters.status === "published"
      ? {
          published: true,
          archived: false,
        }
      : filters.status === "draft"
        ? {
            published: false,
            archived: false,
          }
        : filters.status === "archived"
          ? { archived: true }
          : {}),
  };

  const total =
    await prisma.book.count({
      where,
    });

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE),
  );

  const page = Math.min(
    requestedPage,
    totalPages,
  );

  const [
    books,
    classes,
    subjects,
    boards,
    series,
  ] = await Promise.all([
    prisma.book.findMany({
      where,
      include: {
        class: true,
        subject: true,
        series: true,
        boardRecord: true,
      },
      orderBy: [
        { updatedAt: "desc" },
        { title: "asc" },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.class.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),
    prisma.subject.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),
    prisma.board.findMany({
      where: {
        publisherId: actor.publisherId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.bookSeries.findMany({
      where: {
        publisherId: actor.publisherId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const rows: BookTableItem[] =
    books.map((book) => ({
      id: book.id,
      title: book.title,
      slug: book.slug,
      author: book.author,
      isbn: book.isbn,
      edition: book.edition,
      price:
        book.price?.toString() ?? null,
      subtitle: book.subtitle,
      coverImage: bookCoverPath(
        book.id,
        book.coverImage,
      ),
      featured: book.featured,
      featuredOrder:
        book.featuredOrder,
      published: book.published,
      archived: book.archived,
      board:
        book.boardRecord?.name ??
        book.board,
      publicPreviewAvailable:
        Boolean(
          book.publicPreviewPdf ||
            book.samplePdf,
        ),
      fullBookAvailable: false,
      class: book.class,
      subject: book.subject,
      series: book.series,
      createdAt:
        book.createdAt.toISOString(),
      updatedAt:
        book.updatedAt.toISOString(),
    }));

  const filtered =
    Boolean(filters.q) ||
    Boolean(filters.classId) ||
    Boolean(filters.subjectId) ||
    Boolean(filters.boardId) ||
    Boolean(filters.seriesId) ||
    Boolean(filters.status);

  const start =
    total === 0
      ? 0
      : (page - 1) *
          PAGE_SIZE +
        1;

  const end = Math.min(
    page * PAGE_SIZE,
    total,
  );

  return (
    <main className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
            Content Studio
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Books
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Search, open and continue
            production.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/master"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Database className="h-3.5 w-3.5" />
            Master Data
          </Link>

          <Link
            href="/admin/books/new"
            className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Book
          </Link>
        </div>
      </header>

      <form className="rounded-2xl border border-slate-200 bg-white p-2.5">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[2fr_repeat(5,minmax(0,1fr))_auto]">
          <label className="relative">
            <span className="sr-only">
              Search books
            </span>
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Search title, author or ISBN"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[11px] outline-none focus:border-blue-400"
            />
          </label>

          <Filter
            name="classId"
            label="All classes"
            value={filters.classId}
            options={classes}
          />

          <Filter
            name="subjectId"
            label="All subjects"
            value={filters.subjectId}
            options={subjects}
          />

          <Filter
            name="boardId"
            label="All boards"
            value={filters.boardId}
            options={boards}
          />

          <Filter
            name="seriesId"
            label="All series"
            value={filters.seriesId}
            options={series}
          />

          <select
            name="status"
            defaultValue={
              filters.status ?? ""
            }
            aria-label="Status"
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px]"
          >
            <option value="">
              All statuses
            </option>
            <option value="published">
              Published
            </option>
            <option value="draft">
              Draft
            </option>
            <option value="archived">
              Archived
            </option>
          </select>

          <button className="h-8 rounded-lg bg-slate-900 px-3 text-[11px] font-bold text-white">
            Apply
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
        <span>
          Showing {start}–{end} of{" "}
          {total} books
        </span>

        {filtered ? (
          <Link
            href="/admin/books"
            className="font-semibold text-blue-700"
          >
            Clear filters
          </Link>
        ) : null}
      </div>

      <BookTable
        books={rows}
        filtered={filtered}
      />

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          filters={filters}
        />
      ) : null}
    </main>
  );
}

function Filter({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<{
    id: string;
    name: string;
  }>;
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      aria-label={label}
      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px]"
    >
      <option value="">
        {label}
      </option>

      {options.map((option) => (
        <option
          key={option.id}
          value={option.id}
        >
          {option.name}
        </option>
      ))}
    </select>
  );
}

function Pagination({
  page,
  totalPages,
  filters,
}: {
  page: number;
  totalPages: number;
  filters: Filters;
}) {
  const pages = pageNumbers(
    page,
    totalPages,
  );

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1"
      aria-label="Book pagination"
    >
      <PageLink
        disabled={page <= 1}
        href={buildHref(
          filters,
          page - 1,
        )}
      >
        Previous
      </PageLink>

      {pages.map((number) => (
        <Link
          key={number}
          href={buildHref(
            filters,
            number,
          )}
          aria-current={
            number === page
              ? "page"
              : undefined
          }
          className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-[10px] font-bold ${
            number === page
              ? "bg-blue-600 text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {number}
        </Link>
      ))}

      <PageLink
        disabled={page >= totalPages}
        href={buildHref(
          filters,
          page + 1,
        )}
      >
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function buildHref(
  filters: Filters,
  page: number,
) {
  const params =
    new URLSearchParams();

  for (const [key, value] of Object.entries(
    filters,
  )) {
    if (
      key !== "page" &&
      value
    ) {
      params.set(key, value);
    }
  }

  params.set(
    "page",
    String(Math.max(1, page)),
  );

  return `/admin/books?${params.toString()}`;
}

function pageNumbers(
  page: number,
  totalPages: number,
) {
  const start = Math.max(
    1,
    Math.min(
      page - 2,
      totalPages - 4,
    ),
  );

  const end = Math.min(
    totalPages,
    start + 4,
  );

  return Array.from(
    {
      length:
        end - start + 1,
    },
    (_, index) =>
      start + index,
  );
}

function normalizePage(
  value?: string,
) {
  const page = Number(value);

  if (
    !Number.isInteger(page) ||
    page < 1
  ) {
    return 1;
  }

  return page;
}
