"use client";

import {
  BookOpen,
  ChevronRight,
} from "lucide-react";

const chapters = [
  "Living and Non-Living Things",
  "Plants Around Us",
  "Animals and Their Habitat",
  "Food and Health",
  "Water Resources",
  "Air Around Us",
  "Force and Energy",
  "Earth and Space",
];

export default function TableOfContents() {
  if (!chapters.length) return null;

  return (
    <section className="py-8">

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        {/* Header */}

        <div className="border-b border-slate-100 px-8 py-6">

          <span className="inline-flex rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-[#0B5ED7]">
            TABLE OF CONTENTS
          </span>

          <h2 className="mt-4 text-3xl font-bold text-slate-900">
            Chapters Included
          </h2>

          <p className="mt-2 text-slate-600">
            Quick overview of the topics covered in this book.
          </p>

        </div>

        {/* Chapters */}

        <div>

          {chapters.map((chapter, index) => (

            <div
              key={index}
              className="group flex items-center gap-5 border-b border-slate-100 px-8 py-4 transition-all hover:bg-blue-50 last:border-0"
            >

              {/* Number */}

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-[#0B5ED7]">

                {String(index + 1).padStart(2, "0")}

              </div>

              {/* Chapter */}

              <div className="min-w-0 flex-1">

                <div className="flex items-center gap-2">

                  <BookOpen
                    size={15}
                    className="text-slate-400"
                  />

                  <p className="truncate text-[15px] font-medium text-slate-700">

                    {chapter}

                  </p>

                </div>

              </div>

              {/* Arrow */}

              <ChevronRight
                size={18}
                className="text-slate-400 transition group-hover:text-[#0B5ED7]"
              />

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}