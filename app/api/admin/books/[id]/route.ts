import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json(book);
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

    const body = await request.json();

    const {
      title,
      subtitle,
      isbn,
      description,

      coverImage,
      samplePdf,

      classId,
      subjectId,
      seriesId,

      featured,
      published,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        {
          message: "Book title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!classId) {
      return NextResponse.json(
        {
          message: "Please select a class.",
        },
        {
          status: 400,
        }
      );
    }

    if (!subjectId) {
      return NextResponse.json(
        {
          message: "Please select a subject.",
        },
        {
          status: 400,
        }
      );
    }

    const slug = generateSlug(title);

    const updatedBook = await prisma.book.update({
      where: {
        id,
      },
      data: {
        title,
        subtitle: subtitle || null,
        slug,

        isbn: isbn || null,
        description: description || null,

        coverImage: coverImage || null,
        samplePdf: samplePdf || null,

        classId,
        subjectId,

        seriesId: seriesId || null,

        featured: featured ?? false,
        published: published ?? true,
      },
      include: {
        class: true,
        subject: true,
        series: true,
      },
    });

    return NextResponse.json(updatedBook);
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