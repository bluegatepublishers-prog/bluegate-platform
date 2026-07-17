import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi, publisherAdminNotFound } from "@/lib/publisher-admin-authorization";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response) return response;

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
    const updated = await prisma.teacher.updateMany({
      where: { id, school: { publisherId: actor.publisherId } },
      data: { verified: body.verified },
    });
    if (updated.count !== 1) return publisherAdminNotFound();
    const teacher = await prisma.teacher.findFirst({
      where: { id, school: { publisherId: actor.publisherId } },
    });
    if (!teacher) return publisherAdminNotFound();

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
