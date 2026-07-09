import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(["ADMIN"]);

  if (!user) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  const allowedStatuses = ["NEW", "READ", "ARCHIVED"];

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json(
      { message: "Invalid status" },
      { status: 400 }
    );
  }

  const updated = await prisma.contactMessage.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}