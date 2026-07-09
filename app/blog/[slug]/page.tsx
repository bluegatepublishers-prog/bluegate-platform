import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({ where: { slug, published: true }, include: { author: true } });
  if (!post) notFound();
  return (
    <main className="min-h-screen bg-slate-50 py-16">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm lg:p-12">
        <p className="text-blue-700">{post.publishedAt?.toLocaleDateString()} · {post.author.name}</p>
        <h1 className="mt-4 text-5xl font-bold">{post.title}</h1>
        <p className="mt-8 whitespace-pre-wrap text-lg leading-8 text-slate-700">{post.content}</p>
      </article>
    </main>
  );
}
