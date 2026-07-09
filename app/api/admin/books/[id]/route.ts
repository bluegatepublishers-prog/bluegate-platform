import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const updatedBook = await prisma.book.update({
      where: {
        id,
      },
      data: {
        ...toBookPersistenceData(form),
        slug,
      },
      include: {
        class: true,
        subject: true,
        series: true,
      },
    });

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
    const { id } = await params;

    await prisma.book.delete({
      where: {
        id,
      },
    });

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
