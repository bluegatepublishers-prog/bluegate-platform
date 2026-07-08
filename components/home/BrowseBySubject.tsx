"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

const subjects = [
  {
    title: "English",
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Mathematics",
    color: "from-yellow-500 to-orange-500",
  },
  {
    title: "Science",
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "EVS",
    color: "from-lime-500 to-green-500",
  },
  {
    title: "Hindi",
    color: "from-orange-500 to-red-500",
  },
  {
    title: "Social Science",
    color: "from-sky-500 to-blue-600",
  },
  {
    title: "Computer",
    color: "from-violet-500 to-purple-600",
  },
  {
    title: "Artificial Intelligence",
    color: "from-pink-500 to-fuchsia-600",
  },
];

export default function BrowseBySubject() {
  return (
    <section className="bg-[#F9F5FF] py-24">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-14 text-center">

          <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">
            Explore Subjects
          </span>

          <h2 className="mt-5 text-5xl font-bold text-[#083A75]">
            Browse Books by Subject
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">
            Discover high-quality curriculum books organised subject-wise
            from Nursery to Class XII.
          </p>

        </div>

        <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-4">

          {subjects.map((subject) => (

            <Link
              key={subject.title}
              href={`/books?subject=${encodeURIComponent(subject.title)}`}
              className="group overflow-hidden rounded-3xl bg-white shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >

              <div
                className={`bg-gradient-to-r ${subject.color} p-8 text-white`}
              >

                <BookOpen
                  size={42}
                  className="mb-5 opacity-90"
                />

                <h3 className="text-2xl font-bold leading-tight">
                  {subject.title}
                </h3>

              </div>

              <div className="flex items-center justify-between p-6">

                <span className="font-semibold text-slate-700">
                  Explore Books
                </span>

                <ArrowRight
                  size={20}
                  className="transition group-hover:translate-x-2"
                />

              </div>

            </Link>

          ))}

        </div>

      </div>
    </section>
  );
}