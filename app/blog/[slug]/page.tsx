import Link from "next/link";

export default function BlogPostPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16">
      <div className="mx-auto max-w-5xl px-6">
        <h1 className="text-5xl font-bold">Blog article coming soon</h1>
        <p className="mt-6 text-lg text-slate-600">We’re preparing blog content for this page.</p>
        <Link href="/blog" className="mt-8 inline-block text-blue-700 underline">
          Back to Blog
        </Link>
      </div>
    </main>
  );
}
