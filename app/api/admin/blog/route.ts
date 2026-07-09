import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export async function GET() {
  if (!(await getApiUser(["ADMIN"]))) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(request: Request) {
  const user = await getApiUser(["ADMIN"]);
  if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const body = await request.json();
  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ message: "Title and content are required." }, { status: 400 });
  }
  const base = slugify(body.title);
  let slug = base;
  let count = 1;
  while (await prisma.blogPost.findUnique({ where: { slug } })) slug = `${base}-${count++}`;
  const published = Boolean(body.published);
  const post = await prisma.blogPost.create({
    data: {
      title: body.title.trim(), slug, excerpt: body.excerpt?.trim() || body.content.slice(0, 180),
      content: body.content.trim(), coverImage: body.coverImage?.trim() || null,
      published, featured: Boolean(body.featured), authorId: user.id,
      publishedAt: published ? new Date() : null,
    },
  });
  return NextResponse.json(post, { status: 201 });
}
