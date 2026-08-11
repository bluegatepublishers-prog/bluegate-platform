import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Pencil } from "lucide-react";

import ResourceAttachmentManager from "@/components/admin/resources/ResourceAttachmentManager";
import ResourceMoreMenu from "@/components/admin/resources/ResourceMoreMenu";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminResourceOwnership } from "@/lib/publisher-admin-data";
import { getResourceAudienceLabel } from "@/lib/resource-audience-ui";
import { formatFileSizeBytes, getResourceFileName } from "@/lib/resource-helpers";

export const dynamic = "force-dynamic";

export default async function AdminResourceDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string; attach?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const actor = await requirePublisherAdminResourceOwnership(id);
  const [resource, books, activity] = await Promise.all([
    prisma.resource.findFirst({
      where: { id, publisherId: actor.publisherId },
      include: {
        classRef: { select: { name: true } },
        subjectRef: { select: { name: true } },
        seriesRef: { select: { name: true } },
        book: { select: { title: true } },
        edition: { select: { title: true } },
        unit: { select: { title: true } },
        chapter: { select: { title: true } },
        module: { select: { title: true } },
        topic: { select: { title: true } },
        exercise: { select: { title: true } },
        bookResourceLinks: {
          where: { active: true },
          orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
          include: {
            book: { select: { title: true } },
            part: { select: { title: true } },
            unit: { select: { title: true } },
            chapter: { select: { title: true } },
            module: { select: { title: true } },
            topic: { select: { title: true } },
          },
        },
        schoolEntitlements: {
          where: { status: "ACTIVE" },
          include: { school: { select: { schoolName: true } } },
          orderBy: { assignedAt: "desc" },
        },
        _count: {
          select: {
            bookmarks: true,
            downloads: true,
            studentBookmarks: true,
            studentDownloads: true,
            classMaterials: true,
            assignmentAttachments: true,
          },
        },
      },
    }),
    prisma.book.findMany({
      where: { publisherId: actor.publisherId, archived: false },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.securityAuditEvent.findMany({
      where: { publisherId: actor.publisherId, targetId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, action: true, outcome: true, createdAt: true },
    }),
  ]);
  if (!resource) notFound();

  const returnTo = safeReturnTo(query.returnTo);
  const protectedFilePath = `/api/resources/${resource.id}/download`;
  const fileName = getResourceFileName(resource);
  const fileSize = formatFileSizeBytes(
    resource.fileSizeBytes === null ? null : Number(resource.fileSizeBytes),
  );
  const legacyPlacements = [
    resource.book?.title ? `Book: ${resource.book.title}` : null,
    resource.edition?.title ? `Edition: ${resource.edition.title}` : null,
    resource.unit?.title ? `Unit: ${resource.unit.title}` : null,
    resource.chapter?.title ? `Chapter: ${resource.chapter.title}` : null,
    resource.module?.title ? `Module: ${resource.module.title}` : null,
    resource.topic?.title ? `Topic: ${resource.topic.title}` : null,
    resource.exercise?.title ? `Exercise: ${resource.exercise.title}` : null,
  ].filter((value): value is string => Boolean(value));
  const links = resource.bookResourceLinks.map((link) => {
    const target =
      link.part?.title ??
      link.unit?.title ??
      link.chapter?.title ??
      link.module?.title ??
      link.topic?.title;
    const targetId =
      link.partId ?? link.unitId ?? link.chapterId ?? link.moduleId ?? link.topicId;
    return {
      id: link.id,
      bookId: link.bookId,
      bookTitle: link.book.title,
      targetType: link.targetType,
      targetId,
      targetLabel:
        link.targetType === "BOOK"
          ? "Whole book"
          : `${titleCase(link.targetType)}: ${target ?? "Unknown target"}`,
      audienceOverride: link.audienceOverride,
      qrEligible: link.qrEligible,
    };
  });

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link href={returnTo} className="inline-flex items-center text-sm font-semibold text-blue-700">
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
        Back to resource library
      </Link>

      <header className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>{resource.type.replaceAll("_", " ")}</span>
            <span>·</span>
            <span>{resource.archived ? "Archived" : resource.published ? "Published" : "Draft"}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">{resource.title}</h1>
          <p className="mt-2 max-w-3xl text-slate-600">{resource.description || "No description provided."}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/resources/${id}/edit`} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold">
            <Pencil className="h-4 w-4" aria-hidden /> Edit
          </Link>
          <ResourceMoreMenu id={id} published={resource.published} archived={resource.archived} returnTo={returnTo} type={resource.type} />
        </div>
      </header>

      <nav aria-label="Resource detail sections" className="flex gap-2 overflow-x-auto rounded-xl border bg-white p-2 text-sm font-semibold">
        {["preview", "metadata", "usage", "access", "activity"].map((section) => (
          <a key={section} href={`#${section}`} className="whitespace-nowrap rounded-lg px-3 py-2 capitalize text-slate-700 hover:bg-slate-100">{section}</a>
        ))}
      </nav>

      <section id="preview" className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <ResourcePreview type={resource.type} title={resource.title} href={protectedFilePath} externalHref={resource.type === "LINK" ? resource.fileUrl : null} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
          <div>
            <p className="font-semibold">{fileName}</p>
            <p className="text-sm text-slate-500">{resource.mimeType ?? "Type unavailable"}{fileSize ? ` · ${fileSize}` : ""}</p>
          </div>
          <a href={resource.type === "LINK" ? resource.fileUrl : protectedFilePath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            {resource.type === "LINK" ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {resource.type === "LINK" ? "Open link" : "Download"}
          </a>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <section id="metadata" className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Metadata</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Fact label="Audience" value={getResourceAudienceLabel(resource.audience)} />
            <Fact label="Class" value={(resource.classRef?.name ?? resource.classLevel) || "General"} />
            <Fact label="Subject" value={(resource.subjectRef?.name ?? resource.subject) || "General"} />
            <Fact label="Series" value={resource.seriesRef?.name ?? "None"} />
            <Fact label="Featured" value={resource.featured ? "Yes" : "No"} />
            <Fact label="Updated" value={formatDate(resource.updatedAt)} />
          </dl>
          {legacyPlacements.length ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-950">Legacy direct placement</p>
              <p className="mt-1 text-sm text-amber-800">Retained for compatibility; new placements use Book Studio links.</p>
              <ul className="mt-2 list-inside list-disc text-sm text-amber-900">{legacyPlacements.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Usage summary</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <Fact label="Book placements" value={String(links.length + legacyPlacements.length)} />
            <Fact label="Schools" value={String(resource.schoolEntitlements.length)} />
            <Fact label="Downloads" value={String(resource._count.downloads + resource._count.studentDownloads)} />
            <Fact label="Bookmarks" value={String(resource._count.bookmarks + resource._count.studentBookmarks)} />
            <Fact label="Class materials" value={String(resource._count.classMaterials)} />
            <Fact label="Assignments" value={String(resource._count.assignmentAttachments)} />
          </dl>
        </section>
      </div>

      <ResourceAttachmentManager resourceId={resource.id} books={books} links={links} initiallyOpen={query.attach === "1"} />

      <section id="access" className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">School access</h2>
        <p className="mt-1 text-sm text-slate-500">Active school resource entitlements. Audience rules still apply at delivery time.</p>
        <ul className="mt-4 divide-y">
          {resource.schoolEntitlements.length ? resource.schoolEntitlements.map((entitlement) => (
            <li key={entitlement.id} className="flex justify-between gap-3 py-3 text-sm"><span className="font-semibold">{entitlement.school.schoolName}</span><span className="text-slate-500">Assigned {formatDate(entitlement.assignedAt)}</span></li>
          )) : <li className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No direct school entitlements.</li>}
        </ul>
      </section>

      <section id="activity" className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Activity</h2>
        <ul className="mt-4 divide-y">
          {activity.length ? activity.map((event) => (
            <li key={event.id} className="flex flex-col justify-between gap-1 py-3 text-sm sm:flex-row">
              <span className="font-semibold">{event.action.replaceAll(".", " ")}</span>
              <span className="text-slate-500">{event.outcome} · {formatDateTime(event.createdAt)}</span>
            </li>
          )) : <li className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No recorded activity yet.</li>}
        </ul>
      </section>
    </main>
  );
}

function ResourcePreview({ type, title, href, externalHref }: { type: string; title: string; href: string; externalHref: string | null }) {
  if (type === "PDF") return <iframe title={`${title} preview`} src={href} className="h-[62vh] min-h-96 w-full bg-slate-100" />;
  if (type === "VIDEO") return <video controls preload="metadata" src={href} className="aspect-video w-full bg-black">Video playback is not supported.</video>;
  if (type === "AUDIO") return <div className="flex min-h-48 items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8"><audio controls preload="metadata" src={href} className="w-full max-w-xl">Audio playback is not supported.</audio></div>;
  if (type === "LINK" && externalHref) {
    const host = new URL(externalHref).hostname;
    return <div className="flex min-h-64 flex-col items-center justify-center bg-slate-50 p-8 text-center"><ExternalLink className="h-12 w-12 text-blue-600" /><h2 className="mt-4 text-xl font-bold">External resource</h2><p className="mt-2 text-slate-500">{host}</p><p className="mt-1 text-sm text-slate-400">External pages are not embedded for security and privacy.</p></div>;
  }
  return <div className="flex min-h-64 flex-col items-center justify-center bg-slate-50 p-8 text-center"><Download className="h-12 w-12 text-blue-600" /><h2 className="mt-4 text-xl font-bold">Preview not available</h2><p className="mt-2 max-w-lg text-slate-500">Office documents, archives, and specialized resources are downloaded through the protected resource endpoint.</p></div>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-800">{value}</dd></div>;
}

function safeReturnTo(value?: string) {
  return value?.startsWith("/admin/resources") && !value.startsWith("//") ? value : "/admin/resources";
}

function titleCase(value: string) {
  return value[0] + value.slice(1).toLowerCase();
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
