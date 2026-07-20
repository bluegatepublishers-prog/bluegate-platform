import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";

function parseBody(body: unknown, publisherId: string) {
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const active = typeof input.active === "boolean" ? input.active : Boolean(input.active);
  return { name, code, description: description || null, active, publisherId };
}

export async function GET() {
  try {
    const access = await authorizePublisherAdminApi();
    if (access.response) return access.response;
    const series = await prisma.bookSeries.findMany({
      where: {
        active: true,
        publisherId: access.actor.publisherId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(series);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Unable to load book series.",
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
    const body = parseBody(await request.json(), access.actor.publisherId);

    if (!body.name || !body.code) {
      return NextResponse.json({ message: "Name and code are required." }, { status: 400 });
    }

    const existing = await prisma.bookSeries.findUnique({ where: { code: body.code }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ message: "A series with this code already exists." }, { status: 409 });
    }

    const created = await prisma.bookSeries.create({ data: body });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Unable to create series." }, { status: 500 });
  }
}
