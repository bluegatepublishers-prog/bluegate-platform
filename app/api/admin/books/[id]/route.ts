import { Prisma, SecurityAuditOutcome } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { removeManagedBookFiles } from "@/lib/book-files";
import { parseBookFormData, toBookPersistenceData } from "@/lib/book-form-data";
import { prisma } from "@/lib/prisma";
import {
  authorizePublisherAdminApi,
  publisherAdminNotFound,
} from "@/lib/publisher-admin-authorization";
import { validatePublisherAdminBookRelations } from "@/lib/publisher-admin-data";
import { isPublisherStorageValue } from "@/lib/storage/upload-policy";
import { publisherAdminAuditActor, recordTrustedDeniedAudit, recordTrustedFailureAudit, writeSecurityAuditEvent } from "@/lib/security-audit";

function generateSlug(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;

  try {
    const book = await prisma.book.findFirst({
      where: { id, publisherId: access.actor.publisherId },
      include: { class: true, subject: true, series: true },
    });
    if (!book) return publisherAdminNotFound();
    return NextResponse.json({ ...book, ...parseBookFormData(book) });
  } catch {
    console.warn("Publisher Admin book read failed.", { code: "BOOK_READ_FAILED" });
    return NextResponse.json({ message: "Unable to fetch book." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;

  try {
    const form = parseBookFormData(await request.json());
    if (!form.title) return NextResponse.json({ message: "Book title is required." }, { status: 400 });
    if (!form.classId) return NextResponse.json({ message: "Please select a class." }, { status: 400 });
    if (!form.subjectId) return NextResponse.json({ message: "Please select a subject." }, { status: 400 });
    const currentFiles = await prisma.book.findFirst({ where: { id, publisherId: access.actor.publisherId }, select: { coverImage: true, samplePdf: true, publicPreviewPdf: true, fullBookPdf: true } });
    if (!currentFiles) {
      await recordTrustedDeniedAudit({ actor: publisherAdminAuditActor(access.actor), action: "publisher.book.update", targetType: "Book", reasonCode: "CROSS_TENANT_SCOPE", metadata: { scope: "publisher" } });
      return publisherAdminNotFound();
    }
    if ((form.coverImage !== currentFiles.coverImage && !isPublisherStorageValue(form.coverImage, access.actor.publisherId, ["book-cover"])) || (form.samplePdf !== currentFiles.samplePdf && !isPublisherStorageValue(form.samplePdf, access.actor.publisherId, ["book-sample"])) || (form.publicPreviewPdf !== currentFiles.publicPreviewPdf && !isPublisherStorageValue(form.publicPreviewPdf, access.actor.publisherId, ["book-public-preview"])) || (form.fullBookPdf !== currentFiles.fullBookPdf && !isPublisherStorageValue(form.fullBookPdf, access.actor.publisherId, ["book-full"]))) return NextResponse.json({ message: "Upload files through this publisher workspace." }, { status: 400 });
    if (!await validatePublisherAdminBookRelations({
      publisherId: access.actor.publisherId,
      classId: form.classId,
      subjectId: form.subjectId,
      seriesId: form.seriesId || null,
    })) return NextResponse.json({ message: "One or more selections are unavailable." }, { status: 400 });

    const baseSlug = generateSlug(form.title);
    let slug = baseSlug;
    let count = 1;
    while (await prisma.book.findFirst({ where: { slug, NOT: { id } }, select: { id: true } })) slug = `${baseSlug}-${count++}`;

    if (form.isbn && await prisma.book.findFirst({
      where: {
        publisherId: access.actor.publisherId,
        isbn: { equals: form.isbn, mode: "insensitive" },
        NOT: { id },
      },
      select: { id: true },
    })) return NextResponse.json({ message: "A different book already uses this ISBN." }, { status: 409 });

    const result = await prisma.$transaction(async (tx) => {
      const previous = await tx.book.findFirst({
        where: { id, publisherId: access.actor.publisherId },
        select: {
          slug: true, coverImage: true, samplePdf: true, publicPreviewPdf: true,
          fullBookPdf: true, galleryImages: true, subtitle: true, description: true,
          edition: true, publisher: true, language: true, board: true, binding: true,
          dimensions: true,
        },
      });
      if (!previous) return null;
      const updated = await tx.book.update({
        where: { id },
        data: {
          ...toBookPersistenceData(form),
          publisherId: access.actor.publisherId,
          subtitle: previous.subtitle,
          description: previous.description,
          galleryImages: previous.galleryImages,
          edition: previous.edition,
          publisher: previous.publisher,
          language: previous.language,
          board: previous.board,
          binding: previous.binding,
          dimensions: previous.dimensions,
          slug,
        },
        include: { class: true, subject: true, series: true },
      });
      const changedFiles = [
        previous.coverImage !== updated.coverImage,
        previous.samplePdf !== updated.samplePdf,
        previous.publicPreviewPdf !== updated.publicPreviewPdf,
        previous.fullBookPdf !== updated.fullBookPdf,
      ].filter(Boolean).length;
      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(access.actor), action: "publisher.book.update",
        targetType: "Book", targetId: id, outcome: SecurityAuditOutcome.SUCCESS,
        metadata: {
          changedFields: ["bookMetadata", ...(changedFiles ? ["fileAttachments"] : []), ...(form.published !== undefined ? ["publicationState"] : [])],
          fileCount: changedFiles,
        },
      });
      return { previous, updated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!result) return publisherAdminNotFound();
    await removeManagedBookFiles([
      result.previous.coverImage !== result.updated.coverImage ? result.previous.coverImage : null,
      result.previous.samplePdf !== result.updated.samplePdf ? result.previous.samplePdf : null,
      result.previous.publicPreviewPdf !== result.updated.publicPreviewPdf ? result.previous.publicPreviewPdf : null,
      result.previous.fullBookPdf !== result.updated.fullBookPdf ? result.previous.fullBookPdf : null,
    ]);
    revalidatePath("/admin/books");
    revalidatePath("/books");
    revalidatePath(`/books/${result.previous.slug}`);
    revalidatePath(`/books/${result.updated.slug}`);
    return NextResponse.json({ ...result.updated, ...parseBookFormData(result.updated) });
  } catch {
    await recordTrustedFailureAudit({ actor: publisherAdminAuditActor(access.actor), action: "publisher.book.update", targetType: "Book" });
    console.warn("Publisher Admin book update failed.", { code: "BOOK_UPDATE_FAILED" });
    return NextResponse.json({ message: "Unable to update book." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;

  try {
    const book = await prisma.$transaction(async (tx) => {
      const owned = await tx.book.findFirst({
        where: { id, publisherId: access.actor.publisherId },
        select: { slug: true, coverImage: true, samplePdf: true, publicPreviewPdf: true, fullBookPdf: true, galleryImages: true },
      });
      if (!owned) return null;
      await tx.book.delete({ where: { id } });
      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(access.actor), action: "publisher.book.delete",
        targetType: "Book", targetId: id, outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { fileOperation: "delete_requested", fileCount: [owned.coverImage, owned.samplePdf, owned.publicPreviewPdf, owned.fullBookPdf, ...owned.galleryImages].filter(Boolean).length },
      });
      return owned;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!book) {
      await recordTrustedDeniedAudit({ actor: publisherAdminAuditActor(access.actor), action: "publisher.book.delete", targetType: "Book", reasonCode: "CROSS_TENANT_SCOPE", metadata: { scope: "publisher" } });
      return publisherAdminNotFound();
    }

    await removeManagedBookFiles([book.coverImage, book.samplePdf, book.publicPreviewPdf, book.fullBookPdf, ...book.galleryImages]);
    revalidatePath("/admin/books");
    revalidatePath("/books");
    revalidatePath(`/books/${book.slug}`);
    return NextResponse.json({ success: true });
  } catch {
    await recordTrustedFailureAudit({ actor: publisherAdminAuditActor(access.actor), action: "publisher.book.delete", targetType: "Book" });
    console.warn("Publisher Admin book deletion failed.", { code: "BOOK_DELETE_FAILED" });
    return NextResponse.json({ message: "Unable to delete book." }, { status: 500 });
  }
}
