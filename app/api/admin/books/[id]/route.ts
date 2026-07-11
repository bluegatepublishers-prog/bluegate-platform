import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";
import { removeManagedBookFiles } from "@/lib/book-files";
import { revalidatePath } from "next/cache";
import {
  parseBookFormData,
  toBookPersistenceData,
} from "@/lib/book-form-data";

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// =======================
// GET BOOK
// =======================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await getApiUser(["ADMIN"]))) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const book = await prisma.book.findUnique({
      where: {
        id,
      },
      include: {
        class: true,
        subject: true,
        series: true,
      },
    });

    if (!book) {
      return NextResponse.json(
        {
          message: "Book not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      ...book,
      ...parseBookFormData(book),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Unable to fetch book.",
      },
      {
        status: 500,
      }
    );
  }
}

// =======================
// UPDATE BOOK
// =======================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await getApiUser(["ADMIN"]))) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const form = parseBookFormData(await request.json());

    if (!form.title) {
      return NextResponse.json(
        {
          message: "Book title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!form.classId) {
      return NextResponse.json(
        {
          message: "Please select a class.",
        },
        {
          status: 400,
        }
      );
    }

    if (!form.subjectId) {
      return NextResponse.json(
        {
          message: "Please select a subject.",
        },
        {
          status: 400,
        }
      );
    }

    const baseSlug = generateSlug(form.title);
    let slug = baseSlug;
    let count = 1;

    while (
      await prisma.book.findFirst({
        where: {
          slug,
          NOT: { id },
        },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${count++}`;
    }

    if (form.isbn && await prisma.book.findFirst({ where: { isbn: { equals: form.isbn, mode: "insensitive" }, NOT: { id } }, select: { id: true } })) {
      return NextResponse.json({ message: "A different book already uses this ISBN." }, { status: 409 });
    }

    const previous = await prisma.book.findUnique({ where: { id }, select: { slug: true, coverImage: true, samplePdf: true, publicPreviewPdf: true, fullBookPdf: true, galleryImages: true, subtitle: true, description: true, edition: true, publisher: true, language: true, board: true, binding: true, dimensions: true } });
    if (!previous) return NextResponse.json({ message: "Book not found." }, { status: 404 });
    const existingBook = previous;

    const updatedBook = await prisma.book.update({
      where: {
        id,
      },
      data: {
        ...toBookPersistenceData(form),
        // These fields are intentionally hidden from the simplified form.
        // Preserve existing values instead of interpreting omission as deletion.
        subtitle: existingBook.subtitle,
        description: existingBook.description,
        galleryImages: existingBook.galleryImages,
        edition: existingBook.edition,
        publisher: existingBook.publisher,
        language: existingBook.language,
        board: existingBook.board,
        binding: existingBook.binding,
        dimensions: existingBook.dimensions,
        slug,
      },
      include: {
        class: true,
        subject: true,
        series: true,
      },
    });

    await removeManagedBookFiles([
      existingBook.coverImage !== updatedBook.coverImage ? existingBook.coverImage : null,
      existingBook.samplePdf !== updatedBook.samplePdf ? existingBook.samplePdf : null,
      existingBook.publicPreviewPdf !== updatedBook.publicPreviewPdf ? existingBook.publicPreviewPdf : null,
      existingBook.fullBookPdf !== updatedBook.fullBookPdf ? existingBook.fullBookPdf : null,
    ]);
    revalidatePath("/admin/books");
    revalidatePath("/books");
    revalidatePath(`/books/${existingBook.slug}`);
    revalidatePath(`/books/${updatedBook.slug}`);
    return NextResponse.json({
      ...updatedBook,
      ...parseBookFormData(updatedBook),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Unable to update book.",
      },
      {
        status: 500,
      }
    );
  }
}

// =======================
// DELETE BOOK
// =======================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await getApiUser(["ADMIN"]))) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const book = await prisma.book.findUnique({ where: { id }, select: { slug: true, coverImage: true, samplePdf: true, publicPreviewPdf: true, fullBookPdf: true, galleryImages: true } });
    if (!book) return NextResponse.json({ message: "Book not found." }, { status: 404 });
    await prisma.book.delete({
      where: {
        id,
      },
    });
    await removeManagedBookFiles([book.coverImage, book.samplePdf, book.publicPreviewPdf, book.fullBookPdf, ...book.galleryImages]);
    revalidatePath("/admin/books");
    revalidatePath("/books");
    revalidatePath(`/books/${book.slug}`);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Unable to delete book.",
      },
      {
        status: 500,
      }
    );
  }
}
