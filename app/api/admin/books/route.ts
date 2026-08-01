import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { SecurityAuditOutcome } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { validatePublisherAdminBookRelations } from "@/lib/publisher-admin-data";
import { parseBookFormData, toBookPersistenceData } from "@/lib/book-form-data";
import { isPublisherStorageValue } from "@/lib/storage/upload-policy";
import { publisherAdminAuditActor, recordTrustedFailureAudit, writeSecurityAuditEvent } from "@/lib/security-audit";

function generateSlug(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export async function GET() {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;

  try {
    const books = await prisma.book.findMany({
      where: { publisherId: access.actor.publisherId },
      include: { class: true, subject: true, series: true, boardRecord: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(books.map((book) => ({ ...book, ...parseBookFormData(book) })));
  } catch {
    console.warn("Publisher Admin book list failed.", { code: "BOOK_LIST_FAILED" });
    return NextResponse.json({ message: "Unable to fetch books." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;

  try {
    const form = parseBookFormData(await request.json());
    if (!form.title) return NextResponse.json({ message: "Book title is required." }, { status: 400 });
    if (!form.classId) return NextResponse.json({ message: "Please select a class." }, { status: 400 });
    if (!form.subjectId) return NextResponse.json({ message: "Please select a subject." }, { status: 400 });
    if (!isPublisherStorageValue(form.coverImage, access.actor.publisherId, ["book-cover"]) || !isPublisherStorageValue(form.samplePdf, access.actor.publisherId, ["book-sample"]) || !isPublisherStorageValue(form.publicPreviewPdf, access.actor.publisherId, ["book-public-preview"]) || !isPublisherStorageValue(form.fullBookPdf, access.actor.publisherId, ["book-full"]) || form.galleryImages.some((url) => !isPublisherStorageValue(url, access.actor.publisherId, ["book-gallery"]))) return NextResponse.json({ message: "Upload files through this publisher workspace." }, { status: 400 });

    const relationsAllowed = await validatePublisherAdminBookRelations({
      publisherId: access.actor.publisherId,
      classId: form.classId,
      subjectId: form.subjectId,
      seriesId: form.seriesId || null,
      boardId: form.boardId || null,
    });
    if (!relationsAllowed) return NextResponse.json({ message: "One or more selections are unavailable." }, { status: 400 });

    const baseSlug = generateSlug(form.title);
    let slug = baseSlug;
    let count = 1;
    while (await prisma.book.findUnique({ where: { slug }, select: { id: true } })) slug = `${baseSlug}-${count++}`;

    if (form.isbn && await prisma.book.findFirst({
      where: { publisherId: access.actor.publisherId, isbn: { equals: form.isbn, mode: "insensitive" } },
      select: { id: true },
    })) return NextResponse.json({ message: "A book with this ISBN already exists." }, { status: 409 });

    const selectedBoard = form.boardId ? await prisma.board.findFirst({ where: { id: form.boardId, publisherId: access.actor.publisherId, active: true }, select: { name: true } }) : null;
    const book = await prisma.$transaction(async (tx) => {
      const created = await tx.book.create({
        data: { ...toBookPersistenceData(form), board: selectedBoard?.name ?? null, slug, publisherId: access.actor.publisherId },
        include: { class: true, subject: true, series: true, boardRecord: true },
      });
      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(access.actor), action: "publisher.book.create",
        targetType: "Book", targetId: created.id, outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { fileCount: [form.coverImage, form.samplePdf, form.publicPreviewPdf, form.fullBookPdf, ...form.galleryImages].filter(Boolean).length },
      });
      return created;
    });
    revalidatePath("/admin/books");
    revalidatePath("/books");
    return NextResponse.json({ ...book, ...parseBookFormData(book) }, { status: 201 });
  } catch {
    await recordTrustedFailureAudit({ actor: publisherAdminAuditActor(access.actor), action: "publisher.book.create", targetType: "Book" });
    console.warn("Publisher Admin book creation failed.", { code: "BOOK_CREATE_FAILED" });
    return NextResponse.json({ message: "Unable to create book." }, { status: 500 });
  }
}
