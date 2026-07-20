import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { authorizePublisherAdminApi, publisherAdminNotFound } from "@/lib/publisher-admin-authorization";

function parseBody(body: unknown) {
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const sortOrder = Number(input.sortOrder);
  const active = typeof input.active === "boolean" ? input.active : Boolean(input.active);
  return { name, code, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0, active };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;
  const item = await prisma.class.findUnique({ where: { id } });
  if (!item) return publisherAdminNotFound();
  return NextResponse.json(item);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;
  const body = parseBody(await request.json());

  if (!body.name || !body.code) {
    return NextResponse.json({ message: "Name and code are required." }, { status: 400 });
  }

  const existing = await prisma.class.findUnique({ where: { code: body.code }, select: { id: true } });
  if (existing && existing.id !== id) {
    return NextResponse.json({ message: "A class with this code already exists." }, { status: 409 });
  }

  const updated = await prisma.class.updateMany({ where: { id }, data: body });
  if (updated.count !== 1) return publisherAdminNotFound();

  revalidatePath("/admin/master/classes");
  return NextResponse.json(await prisma.class.findUnique({ where: { id } }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;

  const dependencyCount = await prisma.book.count({ where: { classId: id } });
  if (dependencyCount > 0) {
    return NextResponse.json({ message: `Cannot delete this class because ${dependencyCount} book${dependencyCount === 1 ? "" : "s"} reference it.`, dependencyCount }, { status: 409 });
  }

  const deleted = await prisma.class.deleteMany({ where: { id } });
  if (deleted.count !== 1) return publisherAdminNotFound();

  revalidatePath("/admin/master/classes");
  return NextResponse.json({ success: true });
}