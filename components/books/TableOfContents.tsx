import { List } from "lucide-react";

const chapters = [
  "Chapter 1 – Living and Non-Living Things",
  "Chapter 2 – Plants Around Us",
  "Chapter 3 – Animals and Their Habitat",
  "Chapter 4 – Food and Health",
  "Chapter 5 – Water Resources",
  "Chapter 6 – Air Around Us",
  "Chapter 7 – Force and Energy",
  "Chapter 8 – Earth and Space",
];

export default function TableOfContents() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-10">
          <h2 className="text-3xl font-bold text-slate-900">
            Table of Contents
          </h2>

          <p className="mt-3 text-slate-600">
            A quick overview of the chapters included in this book.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {chapters.map((chapter, index) => (
            <div
              key={index}
              className="flex items-center justify-between border-b border-slate-100 px-6 py-4 last:border-0 hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <List size={18} className="text-blue-600" />
                <span className="text-slate-700">
                  {chapter}
                </span>
              </div>

              <span className="text-sm font-medium text-slate-400">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}