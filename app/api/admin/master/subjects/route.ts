import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";

function parseBody(body: unknown) {
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const sortOrder = Number(input.sortOrder);
  const active = typeof input.active === "boolean" ? input.active : Boolean(input.active);
  return { name, code, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0, active };
}

export async function GET() {
  try {
    const access = await authorizePublisherAdminApi();
    if (access.response) return access.response;
    const subjects = await prisma.subject.findMany({
      where: {
        active: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Unable to load subjects.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await authorizePublisherAdminApi();
    if (access.response) return access.response;
    const body = parseBody(await request.json());

    if (!body.name || !body.code) {
      return NextResponse.json({ message: "Name and code are required." }, { status: 400 });
    }

    const existing = await prisma.subject.findUnique({ where: { code: body.code }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ message: "A subject with this code already exists." }, { status: 409 });
    }

    const created = await prisma.subject.create({ data: body });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Unable to create subject." }, { status: 500 });
  }
}
