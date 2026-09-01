import Image from "next/image";
import Link from "next/link";
import { BookOpen, Hash, Star } from "lucide-react";

import { Book } from "@/types/book";

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 px-5 pb-6 pt-5">
        {book.featured && (
          <div className="absolute left-5 top-5 flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900 shadow">
            <Star size={12} fill="currentColor" />
            Featured
          </div>
        )}

        <div className="flex justify-center">
          <Image
            src={book.cover}
            alt={book.title}
            width={180}
            height={255}
            className="rounded-2xl shadow-2xl"
            unoptimized
          />
        </div>
      </div>

      <div className="space-y-4 p-5">
        <h3 className="line-clamp-2 min-h-[56px] text-xl font-bold text-slate-900">
          {book.title}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {book.pages ? (
            <MetaCard
              icon={<BookOpen size={16} />}
              title="Pages"
              value={String(book.pages)}
            />
          ) : null}

          {book.board ? (
            <MetaCard
              icon={<Hash size={16} />}
              title="Board"
              value={book.board}
            />
          ) : null}

          <MetaCard
            icon={<BookOpen size={16} />}
            title="Rate"
            value={book.price ? `₹${book.price}` : "—"}
          />
        </div>

        <Link
          href={`/books/${book.slug}`}
          className="flex items-center justify-center rounded-xl bg-[#0B5ED7] py-3 text-sm font-semibold text-white transition hover:bg-[#083A75]"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}

function MetaCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold uppercase">{title}</span>
      </div>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
