import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_SIZE = 50 * 1024 * 1024;

const IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded." },
        { status: 400 }
      );
    }

    let folder = "";
    let maxSize = 0;

    if (IMAGE_TYPES.includes(file.type)) {
      folder = "covers";
      maxSize = MAX_IMAGE_SIZE;
    } else if (file.type === "application/pdf") {
      folder = "pdfs";
      maxSize = MAX_PDF_SIZE;
    } else {
      return NextResponse.json(
        {
          message:
            "Only JPG, PNG, WEBP and PDF files are allowed.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          message:
            folder === "covers"
              ? "Image must be under 5 MB."
              : "PDF must be under 50 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "books",
      folder
    );

    await mkdir(uploadDir, {
      recursive: true,
    });

    const extension = path.extname(file.name);

    const filename = `${uuid()}${extension}`;

    const filepath = path.join(
      uploadDir,
      filename
    );

    await writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/books/${folder}/${filename}`,
      filename,
      folder,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Upload failed.",
      },
      {
        status: 500,
      }
    );
  }
}