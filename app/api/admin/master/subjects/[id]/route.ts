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
  const item = await prisma.subject.findUnique({ where: { id } });
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

  const existing = await prisma.subject.findUnique({ where: { code: body.code }, select: { id: true } });
  if (existing && existing.id !== id) {
    return NextResponse.json({ message: "A subject with this code already exists." }, { status: 409 });
  }

  const updated = await prisma.subject.updateMany({ where: { id }, data: body });
  if (updated.count !== 1) return publisherAdminNotFound();

  revalidatePath("/admin/master/subjects");
  return NextResponse.json(await prisma.subject.findUnique({ where: { id } }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;

  const [books, sectionSubjects, teacherAssignments, studentAnalytics, teacherAnalytics, learningTimeline, skillAnalytics, learningGaps] = await Promise.all([
    prisma.book.count({ where: { subjectId: id } }),
    prisma.sectionSubject.count({ where: { subjectId: id } }),
    prisma.teacherAssignment.count({ where: { subjectId: id } }),
    prisma.studentSubjectAnalytics.count({ where: { subjectId: id } }),
    prisma.teacherAnalytics.count({ where: { subjectId: id } }),
    prisma.learningTimeline.count({ where: { subjectId: id } }),
    prisma.studentSkillAnalytics.count({ where: { subjectId: id } }),
    prisma.studentLearningGap.count({ where: { subjectId: id } }),
  ]);

  const dependencyCount = books + sectionSubjects + teacherAssignments + studentAnalytics + teacherAnalytics + learningTimeline + skillAnalytics + learningGaps;
  if (dependencyCount > 0) {
    return NextResponse.json({ message: `Cannot delete this subject because ${dependencyCount} record${dependencyCount === 1 ? "" : "s"} still reference it.`, dependencyCount }, { status: 409 });
  }

  const deleted = await prisma.subject.deleteMany({ where: { id } });
  if (deleted.count !== 1) return publisherAdminNotFound();

  revalidatePath("/admin/master/subjects");
  return NextResponse.json({ success: true });
}