import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getApiUser(["ADMIN"]))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { message: "Database configuration is not available." },
      { status: 500 }
    );
  }

  const { id } = await params;
  const body = await request.json();

  if (typeof body.verified !== "boolean") {
    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 }
    );
  }

  try {
    const teacher = await prisma.teacher.update({
      where: { id },
      data: { verified: body.verified },
    });

    revalidatePath("/admin/teachers");
    revalidatePath(`/admin/teachers/${id}`);

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("Teacher verification update failed:", error);

    return NextResponse.json(
      { message: "Unable to update teacher verification." },
      { status: 500 }
    );
  }
}
