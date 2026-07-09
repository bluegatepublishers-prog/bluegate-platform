import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Blog | Bluegate Publishers" };

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
  });
  return (
    <main className="min-h-screen bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h1 className="text-5xl font-bold">Bluegate Blog</h1>
        <p className="mt-4 text-lg text-slate-600">Ideas and guidance for schools and educators.</p>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-3xl border bg-white p-8 shadow-sm">
              <p className="text-sm text-blue-700">{post.publishedAt?.toLocaleDateString()}</p>
              <h2 className="mt-3 text-2xl font-bold">{post.title}</h2>
              <p className="mt-4 text-slate-600">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="mt-6 inline-block font-semibold text-blue-700">Read article →</Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
