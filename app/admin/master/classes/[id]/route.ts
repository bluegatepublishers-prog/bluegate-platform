import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  const item = await prisma.class.findUnique({
    where: { id },
  });

  if (!item) {
    return NextResponse.json(
      { message: "Class not found." },
      { status: 404 }
    );
  }

  return NextResponse.json(item);
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  const body = await request.json();

  const updated = await prisma.class.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      sortOrder: Number(body.sortOrder),
      active: body.active,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  await prisma.class.delete({
    where: { id },
  });

  return NextResponse.json({
    success: true,
  });
}