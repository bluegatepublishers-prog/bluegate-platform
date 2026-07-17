import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { validatePublisherAdminBookRelations } from "@/lib/publisher-admin-data";
import { parseBookFormData, toBookPersistenceData } from "@/lib/book-form-data";
import { isPublisherUploadUrl } from "@/lib/storage/upload-policy";

function generateSlug(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export async function GET() {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;

  try {
    const books = await prisma.book.findMany({
      where: { publisherId: access.actor.publisherId },
      include: { class: true, subject: true, series: true },
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
    if (!isPublisherUploadUrl(form.coverImage, access.actor.publisherId, ["book-cover"]) || !isPublisherUploadUrl(form.samplePdf, access.actor.publisherId, ["book-sample"]) || !isPublisherUploadUrl(form.publicPreviewPdf, access.actor.publisherId, ["book-public-preview"]) || !isPublisherUploadUrl(form.fullBookPdf, access.actor.publisherId, ["book-full"]) || form.galleryImages.some((url) => !isPublisherUploadUrl(url, access.actor.publisherId, ["book-gallery"]))) return NextResponse.json({ message: "Upload files through this publisher workspace." }, { status: 400 });

    const relationsAllowed = await validatePublisherAdminBookRelations({
      publisherId: access.actor.publisherId,
      classId: form.classId,
      subjectId: form.subjectId,
      seriesId: form.seriesId || null,
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

    const book = await prisma.book.create({
      data: { ...toBookPersistenceData(form), slug, publisherId: access.actor.publisherId },
      include: { class: true, subject: true, series: true },
    });
    revalidatePath("/admin/books");
    revalidatePath("/books");
    return NextResponse.json({ ...book, ...parseBookFormData(book) }, { status: 201 });
  } catch {
    console.warn("Publisher Admin book creation failed.", { code: "BOOK_CREATE_FAILED" });
    return NextResponse.json({ message: "Unable to create book." }, { status: 500 });
  }
}
