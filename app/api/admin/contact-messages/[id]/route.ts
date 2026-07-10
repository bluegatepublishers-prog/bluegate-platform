import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(["ADMIN"]);

  if (!user) {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json();
  const status = body?.status;

  const allowedStatuses = ["NEW", "READ", "ARCHIVED"];

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json(
      { message: "Invalid status" },
      { status: 400 }
    );
  }

  try {
    const updated = await (prisma as any).contactMessage.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Contact message status update failed:", error);

    return NextResponse.json(
      { message: "Unable to update status" },
      { status: 500 }
    );
  }
} 