import Link from "next/link";
import {
  BookOpen,
  Boxes,
  Box,
  ChevronRight,
  FileText,
  Layers3,
  ListTree,
  Plus,
  Search,
} from "lucide-react";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import BookTable from "@/components/admin/books/BookTable";
import BookInspectorEditor from "@/components/admin/books/BookInspectorEditor";
import HierarchyNodeInspectorEditor from "@/components/admin/books/HierarchyNodeInspectorEditor";
import BookStudioResourcePanel from "@/components/admin/books/BookStudioResourcePanel";
import BookStudioWorkspace from "@/components/admin/books/BookStudioWorkspace";
import CreateHierarchyNodeDialog, {
  type HierarchyCreateOption,
} from "@/components/admin/books/CreateHierarchyNodeDialog";
import HierarchyMoveDialog, {
  type HierarchyMoveConfig,
  type HierarchyMoveDestination,
} from "@/components/admin/books/HierarchyMoveDialog";
import type { BookTableItem } from "@/types/admin-book";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { bookCoverPath } from "@/lib/storage/book-asset-path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Books | Bluegate Admin",
};

type BookWithRelations = Prisma.BookGetPayload<{
  include: {
    class: true;
    subject: true;
    series: true;
    parts: true;
    units: true;
    chapters: true;
    modules: true;
    topics: true;
  };
}>;

type BooksSearchParams = {
  book?: string;
  bookId?: string;
  nodeType?: string;
  nodeId?: string;
  query?: string;
};

type HierarchyNodeType = "PART" | "UNIT" | "CHAPTER" | "MODULE" | "TOPIC";
type HierarchyParentType = "BOOK" | "PART" | "UNIT" | "CHAPTER" | "MODULE";

type HierarchyNode = {
  id: string;
  type: HierarchyNodeType;
  title: string;
  description: string | null;
  published: boolean;
  position: number | null;
  updatedAt: Date | null;
  parentTitle: string | null;
  bookId: string;
  parentType: HierarchyParentType;
  parentId: string;
  children: HierarchyNode[];
};

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<BooksSearchParams>;
}) {
  const actor = await requireLivePublisherAdmin();
  const params = await searchParams;

  if (!process.env.DATABASE_URL) {
    return <PageError title="Database configuration required" message="The admin books workspace cannot load because the database is not configured. Check the DATABASE_URL environment variable and try again." />;
  }

  let books: BookWithRelations[] = [];
  try {
    books = await prisma.book.findMany({
      where: { publisherId: actor.publisherId },
      include: {
        class: true,
        subject: true,
        series: true,
        parts: true,
        units: true,
        chapters: true,
        modules: true,
        topics: true,
      },
      orderBy: [
        { featured: "desc" },
        { featuredOrder: "asc" },
        { updatedAt: "desc" },
        { id: "asc" },
      ],
    });
  } catch {
    return <PageError title="Unable to load books" message="Database connection is unavailable. Check the DATABASE_URL environment variable." />;
  }

  const query = params.query?.trim().toLocaleLowerCase() ?? "";
  const hierarchyByBook = new Map(
    books.map((book) => [book.id, buildBookHierarchy(book)]),
  );
  const visibleBooks = query
    ? books.filter((book) =>
        bookMatches(book, hierarchyByBook.get(book.id) ?? [], query),
      )
    : books;
  const selectedBookId = params.bookId ?? params.book;
  const selectedBook = books.find((book) => book.id === selectedBookId) ?? null;
  const selectedNode =
    selectedBook && params.nodeId && isHierarchyNodeType(params.nodeType)
      ? findHierarchyNode(
          hierarchyByBook.get(selectedBook.id) ?? [],
          params.nodeType,
          params.nodeId,
        )
      : null;
  const createOptions = selectedBook
    ? hierarchyCreateOptions(selectedBook.id, selectedBook.title, selectedNode)
    : [];
  const moveConfig = selectedNode
    ? hierarchyMoveConfig(books, selectedNode)
    : null;
  const tableBooks = visibleBooks.map(toTableBook);
  const classOptions = uniqueOptions(
    books.map((book) => ({ id: book.classId, name: book.class.name })),
  );
  const subjectOptions = uniqueOptions(
    books.map((book) => ({ id: book.subjectId, name: book.subject.name })),
  );
  const seriesOptions = uniqueOptions(
    books.flatMap((book) =>
      book.series && book.seriesId
        ? [{ id: book.seriesId, name: book.series.name }]
        : [],
    ),
  );

  return (
    <main className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Content workspace
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Books
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Explore, manage, and inspect the publisher catalogue.
          </p>
        </div>
        <Link
          href="/admin/books/new"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add Book
        </Link>
      </header>

      <BookStudioWorkspace
        explorer={
          <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
          <BooksExplorer
            books={visibleBooks}
            hierarchyByBook={hierarchyByBook}
            selectedBookId={selectedBook?.id}
            selectedNodeType={selectedNode?.type}
            selectedNodeId={selectedNode?.id}
            query={params.query}
            createOptions={createOptions}
            moveConfig={moveConfig}
          />
          </aside>
        }
        workspace={
          <section className="h-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm sm:p-4">
          <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">Books List</h2>
              <p className="text-sm text-slate-500">
                {query
                  ? `${visibleBooks.length} of ${books.length} books match “${params.query?.trim()}”`
                  : `${books.length} ${books.length === 1 ? "book" : "books"} in this publisher`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <Metric label="Published" value={books.filter((book) => book.published).length} tone="green" />
              <Metric label="Draft" value={books.filter((book) => !book.published).length} tone="amber" />
              <Metric label="Featured" value={books.filter((book) => book.featured).length} tone="blue" />
              {query ? (
                <Link href={selectedBook ? `/admin/books?bookId=${selectedBook.id}` : "/admin/books"} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-100">
                  Clear search
                </Link>
              ) : null}
            </div>
          </div>
          <BookTable books={tableBooks} filtered={Boolean(query)} />
          </section>
        }
        inspector={
          <aside className="h-full min-w-0 overflow-y-auto overflow-x-hidden bg-white p-5">
          <h2 className="border-b border-slate-200 pb-4 text-lg font-bold text-slate-950">
            {selectedNode ? "Node Information" : "Book Information"}
          </h2>
          {selectedBook ? (
            <>
              {selectedNode ? (
                <HierarchyNodeInspectorEditor
                  key={`${selectedNode.type}:${selectedNode.id}`}
                  node={{
                    id: selectedNode.id,
                    nodeType: selectedNode.type,
                    title: selectedNode.title,
                    description: selectedNode.description,
                    published: selectedNode.published,
                    orderValue: selectedNode.position,
                    parentBookTitle: selectedBook.title,
                    parentNodeTitle: selectedNode.parentTitle,
                    apiEndpoint: hierarchyApiEndpoint(selectedNode.type, selectedNode.id),
                    orderField: selectedNode.type === "CHAPTER" ? "sortOrder" : "displayOrder",
                  }}
                />
              ) : (
                <BookInspectorEditor
                  key={selectedBook.id}
                  book={{
                    id: selectedBook.id,
                    title: selectedBook.title,
                    subtitle: selectedBook.subtitle ?? "",
                    classId: selectedBook.classId,
                    subjectId: selectedBook.subjectId,
                    seriesId: selectedBook.seriesId ?? "",
                    isbn: selectedBook.isbn ?? "",
                    published: selectedBook.published,
                    featured: selectedBook.featured,
                    description: selectedBook.description ?? "",
                    updatedAt: selectedBook.updatedAt.toISOString(),
                  }}
                  classes={classOptions}
                  subjects={subjectOptions}
                  series={seriesOptions}
                />
              )}
              <BookStudioResourcePanel
                key={`resources:${selectedNode?.type ?? "BOOK"}:${selectedNode?.id ?? selectedBook.id}`}
                targetType={selectedNode?.type ?? "BOOK"}
                targetId={selectedNode?.id ?? selectedBook.id}
                targetTitle={selectedNode?.title ?? selectedBook.title}
              />
            </>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <BookOpen className="h-6 w-6 text-slate-400" aria-hidden />
              </span>
              <p className="mt-4 text-sm font-medium text-slate-500">
                Select a book to view details.
              </p>
            </div>
          )}
          </aside>
        }
      />
    </main>
  );
}

function LegacyBooksExplorer({
  books,
  selectedId,
  query,
}: {
  books: BookWithRelations[];
  selectedId?: string;
  query?: string;
}) {
  return (
    <>
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-950">Books</h2>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
            {books.length}
          </span>
        </div>
        <form action="/admin/books" className="relative mt-3">
          {selectedId ? <input type="hidden" name="book" value={selectedId} /> : null}
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <input
            type="search"
            name="query"
            defaultValue={query}
            placeholder="Search books"
            aria-label="Search books"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </form>
      </div>
      <nav aria-label="Books explorer" className="max-h-[520px] flex-1 overflow-y-auto p-2 xl:max-h-none">
        {books.length ? (
          <ul className="space-y-1">
            {books.map((book) => {
              const selected = book.id === selectedId;
              const href = `/admin/books?book=${encodeURIComponent(book.id)}${query ? `&query=${encodeURIComponent(query)}` : ""}`;
              return (
                <li key={book.id}>
                  <Link
                    href={href}
                    aria-current={selected ? "true" : undefined}
                    className={`block rounded-xl border px-3 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      selected
                        ? "border-blue-200 bg-blue-50 text-blue-950"
                        : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block truncate text-sm font-semibold">{book.title}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {book.class.name} · {book.subject.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-3 py-10 text-center text-sm text-slate-500">
            No books match this search.
          </div>
        )}
      </nav>
    </>
  );
}

void LegacyBooksExplorer;

function BooksExplorer({
  books,
  hierarchyByBook,
  selectedBookId,
  selectedNodeType,
  selectedNodeId,
  query,
  createOptions,
  moveConfig,
}: {
  books: BookWithRelations[];
  hierarchyByBook: Map<string, HierarchyNode[]>;
  selectedBookId?: string;
  selectedNodeType?: HierarchyNodeType;
  selectedNodeId?: string;
  query?: string;
  createOptions: HierarchyCreateOption[];
  moveConfig: HierarchyMoveConfig | null;
}) {
  const normalizedQuery = query?.trim().toLocaleLowerCase() ?? "";
  return (
    <>
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-slate-950">Books</h2>
          <div className="flex items-center gap-2">
            <HierarchyMoveDialog config={moveConfig} />
            <CreateHierarchyNodeDialog options={createOptions} />
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{books.length}</span>
          </div>
        </div>
        <form action="/admin/books" className="relative mt-3">
          {selectedBookId ? <input type="hidden" name="bookId" value={selectedBookId} /> : null}
          {selectedNodeType ? <input type="hidden" name="nodeType" value={selectedNodeType} /> : null}
          {selectedNodeId ? <input type="hidden" name="nodeId" value={selectedNodeId} /> : null}
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <input type="search" name="query" defaultValue={query} placeholder="Search books and hierarchy" aria-label="Search books and hierarchy" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" />
        </form>
      </div>
      <nav aria-label="Books explorer" className="max-h-[520px] flex-1 overflow-y-auto overflow-x-hidden p-2 xl:max-h-none">
        {books.length ? (
          <ul className="space-y-1">
            {books.map((book) => {
              const selected = book.id === selectedBookId && !selectedNodeId;
              const allNodes = hierarchyByBook.get(book.id) ?? [];
              const bookTitleMatches = book.title.toLocaleLowerCase().includes(normalizedQuery);
              const nodes = normalizedQuery && !bookTitleMatches ? filterHierarchy(allNodes, normalizedQuery) : allNodes;
              const href = selectionHref({ bookId: book.id, query });
              const revealBook = Boolean(normalizedQuery) || (book.id === selectedBookId && Boolean(selectedNodeId));
              return (
                <li key={book.id}>
                  {nodes.length ? (
                    <details open={revealBook}>
                      <summary className="group flex cursor-pointer list-none items-center rounded-lg hover:bg-slate-50">
                        <ChevronRight className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400 transition group-open:rotate-90" aria-hidden />
                        <ExplorerLink href={href} selected={selected} icon={<BookOpen className="h-4 w-4" />} title={book.title} subtitle={`${book.class.name} · ${book.subject.name}`} />
                      </summary>
                      <ul className="ml-3 border-l border-slate-200 pl-1">
                        {nodes.map((node) => <HierarchyTreeNode key={`${node.type}:${node.id}`} node={node} bookId={book.id} query={query} selectedNodeType={selectedNodeType} selectedNodeId={selectedNodeId} forceReveal={Boolean(normalizedQuery)} depth={1} />)}
                      </ul>
                    </details>
                  ) : (
                    <>
                      <ExplorerLink href={href} selected={selected} icon={<BookOpen className="h-4 w-4" />} title={book.title} subtitle={`${book.class.name} · ${book.subject.name}`} />
                      <p className="ml-9 px-2 pb-2 text-[11px] text-slate-400">No hierarchy</p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        ) : <div className="px-3 py-10 text-center text-sm text-slate-500">No books or hierarchy nodes match this search.</div>}
      </nav>
    </>
  );
}

function HierarchyTreeNode({
  node,
  bookId,
  query,
  selectedNodeType,
  selectedNodeId,
  forceReveal,
  depth,
}: {
  node: HierarchyNode;
  bookId: string;
  query?: string;
  selectedNodeType?: HierarchyNodeType;
  selectedNodeId?: string;
  forceReveal: boolean;
  depth: number;
}) {
  const selected = node.type === selectedNodeType && node.id === selectedNodeId;
  const content = <ExplorerLink href={selectionHref({ bookId, nodeType: node.type, nodeId: node.id, query })} selected={selected} icon={nodeIcon(node.type)} title={node.title} compact />;
  if (!node.children.length) return <li style={{ paddingLeft: `${Math.min(depth - 1, 4) * 4}px` }}>{content}</li>;
  return (
    <li style={{ paddingLeft: `${Math.min(depth - 1, 4) * 4}px` }}>
      <details open={forceReveal || hierarchyContainsSelection(node, selectedNodeType, selectedNodeId)}>
        <summary className="group flex cursor-pointer list-none items-center rounded-lg hover:bg-slate-50">
          <ChevronRight className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400 transition group-open:rotate-90" aria-hidden />
          {content}
        </summary>
        <ul className="ml-3 border-l border-slate-200 pl-1">
          {node.children.map((child) => <HierarchyTreeNode key={`${child.type}:${child.id}`} node={child} bookId={bookId} query={query} selectedNodeType={selectedNodeType} selectedNodeId={selectedNodeId} forceReveal={forceReveal} depth={depth + 1} />)}
        </ul>
      </details>
    </li>
  );
}

function ExplorerLink({ href, selected, icon, title, subtitle, compact = false }: { href: string; selected: boolean; icon: React.ReactNode; title: string; subtitle?: string; compact?: boolean }) {
  return (
    <Link href={href} aria-current={selected ? "true" : undefined} className={`flex min-w-0 flex-1 items-start gap-2 rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${compact ? "px-2 py-1.5" : "px-2 py-2.5"} ${selected ? "border-blue-200 bg-blue-50 text-blue-950" : "border-transparent text-slate-700 hover:bg-slate-50"}`}>
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold">{title}</span>
        {subtitle ? <span className="mt-0.5 block truncate text-[11px] text-slate-500">{subtitle}</span> : null}
      </span>
    </Link>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "blue" }) {
  const styles = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return <span className={`rounded-full px-3 py-1.5 ${styles[tone]}`}>{value} {label}</span>;
}

function InspectorFact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className={`mt-1 break-words text-sm font-semibold text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>;
}

function PageError({ title, message }: { title: string; message: string }) {
  return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-slate-900"><h1 className="text-3xl font-bold">{title}</h1><p className="mt-4 text-slate-700">{message}</p></div>;
}

function buildBookHierarchy(book: BookWithRelations): HierarchyNode[] {
  const roots: HierarchyNode[] = [];
  const parts = new Map(
    book.parts.map((part) => [
      part.id,
      createNode("PART", part.id, part.title, part.description, part.published, part.displayOrder, part.updatedAt, null, book.id, "BOOK", book.id),
    ]),
  );
  const units = new Map(
    book.units.map((unit) => [
      unit.id,
      createNode(
        "UNIT",
        unit.id,
        unit.title,
        unit.description,
        unit.published,
        unit.displayOrder,
        unit.updatedAt,
        unit.partId ? parts.get(unit.partId)?.title ?? null : null,
        book.id,
        unit.partId ? "PART" : "BOOK",
        unit.partId ?? book.id,
      ),
    ]),
  );
  const chapters = new Map(
    book.chapters.map((chapter) => [
      chapter.id,
      createNode(
        "CHAPTER",
        chapter.id,
        chapter.title,
        chapter.description,
        chapter.published,
        chapter.sortOrder,
        chapter.updatedAt,
        chapter.unitId
          ? units.get(chapter.unitId)?.title ?? null
          : chapter.partId
            ? parts.get(chapter.partId)?.title ?? null
            : null,
        book.id,
        chapter.unitId ? "UNIT" : chapter.partId ? "PART" : "BOOK",
        chapter.unitId ?? chapter.partId ?? book.id,
      ),
    ]),
  );
  const modules = new Map(
    book.modules.map((module) => [
      module.id,
      createNode(
        "MODULE",
        module.id,
        module.title,
        module.description,
        module.published,
        module.displayOrder,
        module.updatedAt,
        chapters.get(module.chapterId)?.title ?? null,
        book.id,
        "CHAPTER",
        module.chapterId,
      ),
    ]),
  );
  const topics = new Map(
    book.topics.map((topic) => [
      topic.id,
      createNode(
        "TOPIC",
        topic.id,
        topic.title,
        topic.description,
        topic.published,
        topic.displayOrder,
        topic.updatedAt,
        topic.moduleId
          ? modules.get(topic.moduleId)?.title ?? null
          : chapters.get(topic.chapterId)?.title ?? null,
        book.id,
        topic.moduleId ? "MODULE" : "CHAPTER",
        topic.moduleId ?? topic.chapterId,
      ),
    ]),
  );

  for (const part of book.parts) roots.push(parts.get(part.id)!);
  for (const unit of book.units) {
    const node = units.get(unit.id)!;
    if (unit.partId && parts.has(unit.partId)) parts.get(unit.partId)!.children.push(node);
    else roots.push(node);
  }
  for (const chapter of book.chapters) {
    const node = chapters.get(chapter.id)!;
    if (chapter.unitId && units.has(chapter.unitId)) units.get(chapter.unitId)!.children.push(node);
    else if (chapter.partId && parts.has(chapter.partId)) parts.get(chapter.partId)!.children.push(node);
    else roots.push(node);
  }
  for (const module of book.modules) {
    const node = modules.get(module.id)!;
    if (chapters.has(module.chapterId)) chapters.get(module.chapterId)!.children.push(node);
    else roots.push(node);
  }
  for (const topic of book.topics) {
    const node = topics.get(topic.id)!;
    if (topic.moduleId && modules.has(topic.moduleId)) modules.get(topic.moduleId)!.children.push(node);
    else if (chapters.has(topic.chapterId)) chapters.get(topic.chapterId)!.children.push(node);
    else roots.push(node);
  }

  sortHierarchy(roots);
  return roots;
}

function createNode(
  type: HierarchyNodeType,
  id: string,
  title: string,
  description: string | null,
  published: boolean,
  position: number | null,
  updatedAt: Date | null,
  parentTitle: string | null,
  bookId: string,
  parentType: HierarchyParentType,
  parentId: string,
): HierarchyNode {
  return {
    type,
    id,
    title,
    description,
    published,
    position,
    updatedAt,
    parentTitle,
    bookId,
    parentType,
    parentId,
    children: [],
  };
}

function hierarchyApiEndpoint(type: HierarchyNodeType, id: string) {
  const routes: Record<HierarchyNodeType, string> = {
    PART: "book-parts",
    UNIT: "book-units",
    CHAPTER: "book-chapters",
    MODULE: "book-modules",
    TOPIC: "book-topics",
  };

  return `/api/admin/${routes[type]}/${encodeURIComponent(id)}`;
}

function hierarchyCreateOptions(
  bookId: string,
  bookTitle: string,
  selectedNode: HierarchyNode | null,
): HierarchyCreateOption[] {
  const parentType = selectedNode?.type ?? "BOOK";
  const parentId = selectedNode?.id ?? bookId;
  const parentTitle = selectedNode?.title ?? bookTitle;
  const validChildren: Record<
    "BOOK" | HierarchyNodeType,
    HierarchyNodeType[]
  > = {
    BOOK: ["PART", "UNIT", "CHAPTER"],
    PART: ["UNIT", "CHAPTER"],
    UNIT: ["CHAPTER"],
    CHAPTER: ["MODULE", "TOPIC"],
    MODULE: ["TOPIC"],
    TOPIC: [],
  };
  const endpoints: Record<HierarchyNodeType, string> = {
    PART: "/api/admin/book-parts",
    UNIT: "/api/admin/book-units",
    CHAPTER: "/api/admin/book-chapters",
    MODULE: "/api/admin/book-modules",
    TOPIC: "/api/admin/book-topics",
  };

  return validChildren[parentType].map((nodeType) => ({
    nodeType,
    endpoint: endpoints[nodeType],
    bookId,
    parentType,
    parentId,
    parentTitle,
  }));
}

function hierarchyMoveConfig(
  books: BookWithRelations[],
  node: HierarchyNode,
): HierarchyMoveConfig {
  const siblings = hierarchySiblings(
    books,
    node.type,
    node.bookId,
    node.parentType,
    node.parentId,
  ).sort(
    (left, right) =>
      left.position - right.position || left.title.localeCompare(right.title),
  );
  const siblingIndex = Math.max(
    0,
    siblings.findIndex((sibling) => sibling.id === node.id),
  );

  return {
    nodeId: node.id,
    nodeType: node.type,
    nodeTitle: node.title,
    endpoint: hierarchyApiEndpoint(node.type, node.id),
    orderField: node.type === "CHAPTER" ? "sortOrder" : "displayOrder",
    parentType: node.parentType,
    parentId: node.parentId,
    siblingIndex,
    siblingCount: Math.max(1, siblings.length),
    destinations: hierarchyMoveDestinations(books, node.type),
  };
}

function hierarchyMoveDestinations(
  books: BookWithRelations[],
  nodeType: HierarchyNodeType,
): HierarchyMoveDestination[] {
  const destinations: HierarchyMoveDestination[] = [];
  for (const book of books) {
    if (book.archived) continue;
    const add = (
      parentType: HierarchyMoveDestination["parentType"],
      parentId: string,
      parentTitle: string,
    ) => {
      destinations.push({
        parentType,
        parentId,
        parentTitle,
        bookTitle: book.title,
        siblingCount: hierarchySiblings(
          books,
          nodeType,
          book.id,
          parentType,
          parentId,
        ).length,
      });
    };

    if (nodeType === "PART" || nodeType === "UNIT" || nodeType === "CHAPTER") {
      add("BOOK", book.id, book.title);
    }
    if (nodeType === "UNIT" || nodeType === "CHAPTER") {
      for (const part of book.parts) {
        if (!part.archived) add("PART", part.id, part.title);
      }
    }
    if (nodeType === "CHAPTER") {
      for (const unit of book.units) {
        if (!unit.archived) add("UNIT", unit.id, unit.title);
      }
    }
    if (nodeType === "MODULE" || nodeType === "TOPIC") {
      for (const chapter of book.chapters) {
        if (!chapter.archived) add("CHAPTER", chapter.id, chapter.title);
      }
    }
    if (nodeType === "TOPIC") {
      for (const module of book.modules) {
        if (!module.archived) add("MODULE", module.id, module.title);
      }
    }
  }
  return destinations;
}

function hierarchySiblings(
  books: BookWithRelations[],
  nodeType: HierarchyNodeType,
  bookId: string,
  parentType: HierarchyParentType,
  parentId: string,
) {
  const book = books.find((candidate) => candidate.id === bookId);
  if (!book) return [];
  if (nodeType === "PART") {
    return book.parts
      .filter(() => parentType === "BOOK" && parentId === book.id)
      .map((item) => ({
        id: item.id,
        title: item.title,
        position: item.displayOrder,
      }));
  }
  if (nodeType === "UNIT") {
    return book.units
      .filter((item) =>
        parentType === "PART"
          ? item.partId === parentId
          : parentType === "BOOK" &&
            parentId === book.id &&
            item.partId === null,
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        position: item.displayOrder,
      }));
  }
  if (nodeType === "CHAPTER") {
    return book.chapters
      .filter((item) =>
        parentType === "UNIT"
          ? item.unitId === parentId
          : parentType === "PART"
            ? item.partId === parentId && item.unitId === null
            : parentType === "BOOK" &&
              parentId === book.id &&
              item.partId === null &&
              item.unitId === null,
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        position: item.sortOrder,
      }));
  }
  if (nodeType === "MODULE") {
    return book.modules
      .filter(
        (item) =>
          parentType === "CHAPTER" && item.chapterId === parentId,
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        position: item.displayOrder,
      }));
  }
  return book.topics
    .filter((item) =>
      parentType === "MODULE"
        ? item.moduleId === parentId
        : parentType === "CHAPTER" &&
          item.chapterId === parentId &&
          item.moduleId === null,
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      position: item.displayOrder,
    }));
}

function sortHierarchy(nodes: HierarchyNode[]) {
  nodes.sort((left, right) => (left.position ?? 0) - (right.position ?? 0) || left.title.localeCompare(right.title));
  for (const node of nodes) sortHierarchy(node.children);
}

function bookMatches(book: BookWithRelations, hierarchy: HierarchyNode[], query: string) {
  return [
    book.title,
    book.subtitle,
    book.author,
    book.isbn,
    book.class.name,
    book.subject.name,
    book.series?.name,
  ].some((value) => value?.toLocaleLowerCase().includes(query)) || hierarchy.some((node) => hierarchyTitleMatches(node, query));
}

function hierarchyTitleMatches(node: HierarchyNode, query: string): boolean {
  return node.title.toLocaleLowerCase().includes(query) || node.children.some((child) => hierarchyTitleMatches(child, query));
}

function filterHierarchy(nodes: HierarchyNode[], query: string): HierarchyNode[] {
  return nodes.flatMap((node) => {
    if (node.title.toLocaleLowerCase().includes(query)) return [node];
    const children = filterHierarchy(node.children, query);
    return children.length ? [{ ...node, children }] : [];
  });
}

function findHierarchyNode(nodes: HierarchyNode[], type: HierarchyNodeType, id: string): HierarchyNode | null {
  for (const node of nodes) {
    if (node.type === type && node.id === id) return node;
    const nested = findHierarchyNode(node.children, type, id);
    if (nested) return nested;
  }
  return null;
}

function hierarchyContainsSelection(node: HierarchyNode, type?: HierarchyNodeType, id?: string): boolean {
  return Boolean(type && id && ((node.type === type && node.id === id) || node.children.some((child) => hierarchyContainsSelection(child, type, id))));
}

function selectionHref({ bookId, nodeType, nodeId, query }: { bookId: string; nodeType?: HierarchyNodeType; nodeId?: string; query?: string }) {
  const params = new URLSearchParams({ bookId });
  if (nodeType) params.set("nodeType", nodeType);
  if (nodeId) params.set("nodeId", nodeId);
  if (query) params.set("query", query);
  return `/admin/books?${params.toString()}`;
}

function isHierarchyNodeType(value?: string): value is HierarchyNodeType {
  return value === "PART" || value === "UNIT" || value === "CHAPTER" || value === "MODULE" || value === "TOPIC";
}

function nodeIcon(type: HierarchyNodeType) {
  if (type === "PART") return <Layers3 className="h-3.5 w-3.5" />;
  if (type === "UNIT") return <Boxes className="h-3.5 w-3.5" />;
  if (type === "CHAPTER") return <FileText className="h-3.5 w-3.5" />;
  if (type === "MODULE") return <Box className="h-3.5 w-3.5" />;
  return <ListTree className="h-3.5 w-3.5" />;
}

function titleCase(value: string) {
  return value[0] + value.slice(1).toLowerCase();
}

function uniqueOptions(options: { id: string; name: string }[]) {
  return [...new Map(options.map((option) => [option.id, option])).values()]
    .sort((left, right) => left.name.localeCompare(right.name));
}

function toTableBook(book: BookWithRelations): BookTableItem {
  return {
    id: book.id,
    title: book.title,
    slug: book.slug,
    author: book.author,
    isbn: book.isbn,
    edition: book.edition,
    price: book.price?.toString() ?? null,
    subtitle: book.subtitle,
    coverImage: bookCoverPath(book.id, book.coverImage),
    featured: book.featured,
    featuredOrder: book.featuredOrder,
    published: book.published,
    publicPreviewAvailable: Boolean(book.publicPreviewPdf || book.samplePdf),
    fullBookAvailable: Boolean(book.fullBookPdf),
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
    class: { name: book.class.name },
    subject: { name: book.subject.name },
    series: book.series ? { name: book.series.name } : null,
  };
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
