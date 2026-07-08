import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Failed to fetch classes." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      code,
      sortOrder,
      active,
    } = body;

    if (!name || !code) {
      return NextResponse.json(
        {
          message: "Name and Code are required.",
        },
        {
          status: 400,
        }
      );
    }

    const exists = await prisma.class.findUnique({
      where: {
        code,
      },
    });

    if (exists) {
      return NextResponse.json(
        {
          message: "Class code already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const created = await prisma.class.create({
      data: {
        name,
        code,
        sortOrder: Number(sortOrder) || 0,
        active: active ?? true,
      },
    });

    return NextResponse.json(created, {
      status: 201,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Unable to create class.",
      },
      {
        status: 500,
      }
    );
  }
}