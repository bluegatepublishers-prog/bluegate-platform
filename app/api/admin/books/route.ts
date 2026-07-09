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

export async function GET() {
  try {
    const books = await prisma.book.findMany({
      include: {
        class: true,
        subject: true,
        series: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      books.map((book) => ({
        ...book,
        ...parseBookFormData(book),
      }))
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Unable to fetch books." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = parseBookFormData(await request.json());

    if (!form.title) {
      return NextResponse.json(
        { message: "Book title is required." },
        { status: 400 }
      );
    }

    if (!form.classId) {
      return NextResponse.json(
        { message: "Please select a class." },
        { status: 400 }
      );
    }

    if (!form.subjectId) {
      return NextResponse.json(
        { message: "Please select a subject." },
        { status: 400 }
      );
    }

    let slug = generateSlug(form.title);

    let count = 1;

    while (await prisma.book.findUnique({ where: { slug } })) {
      slug = `${generateSlug(form.title)}-${count++}`;
    }

    const book = await prisma.book.create({
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

    return NextResponse.json(
      {
        ...book,
        ...parseBookFormData(book),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Unable to create book.",
      },
      {
        status: 500,
      }
    );
  }
}
