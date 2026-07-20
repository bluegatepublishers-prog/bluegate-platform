import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi, publisherAdminNotFound } from "@/lib/publisher-admin-authorization";

function parseBody(body: unknown, publisherId: string) {
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const active = typeof input.active === "boolean" ? input.active : Boolean(input.active);
  return { name, code, description: description || null, active, publisherId };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;
  const item = await prisma.bookSeries.findFirst({ where: { id, publisherId: access.actor.publisherId } });
  if (!item) return publisherAdminNotFound();
  return NextResponse.json(item);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;
  const body = parseBody(await request.json(), access.actor.publisherId);

  if (!body.name || !body.code) {
    return NextResponse.json({ message: "Name and code are required." }, { status: 400 });
  }

  const existing = await prisma.bookSeries.findUnique({ where: { code: body.code }, select: { id: true } });
  if (existing && existing.id !== id) {
    return NextResponse.json({ message: "A series with this code already exists." }, { status: 409 });
  }

  const current = await prisma.bookSeries.findFirst({ where: { id, publisherId: access.actor.publisherId }, select: { id: true } });
  if (!current) return publisherAdminNotFound();

  await prisma.bookSeries.update({ where: { id }, data: body });
  revalidatePath("/admin/master/series");
  return NextResponse.json(await prisma.bookSeries.findUnique({ where: { id } }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;

  const current = await prisma.bookSeries.findFirst({ where: { id, publisherId: access.actor.publisherId }, select: { id: true } });
  if (!current) return publisherAdminNotFound();

  const dependencyCount = await prisma.book.count({ where: { seriesId: id } });
  if (dependencyCount > 0) {
    return NextResponse.json({ message: `Cannot delete this series because ${dependencyCount} book${dependencyCount === 1 ? "" : "s"} reference it.`, dependencyCount }, { status: 409 });
  }

  await prisma.bookSeries.delete({ where: { id } });
  revalidatePath("/admin/master/series");
  return NextResponse.json({ success: true });
}