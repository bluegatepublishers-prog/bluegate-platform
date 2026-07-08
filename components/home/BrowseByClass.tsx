"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";

const classes = [
  "Nursery",
  "LKG",
  "UKG",
  "Class I",
  "Class II",
  "Class III",
  "Class IV",
  "Class V",
  "Class VI",
  "Class VII",
  "Class VIII",
  "Class IX",
  "Class X",
  "Class XI",
  "Class XII",
];

const colors = [
  "from-blue-500 to-cyan-500",
  "from-pink-500 to-rose-500",
  "from-emerald-500 to-green-500",
  "from-orange-500 to-amber-500",
  "from-purple-500 to-violet-500",
];

export default function BrowseByClass() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-14 text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Explore by Class
          </span>

          <h2 className="mt-5 text-4xl font-bold text-slate-900">
            Browse Books by Class
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Discover carefully designed books for every stage of learning,
            from Nursery to Class XII.
          </p>

        </div>

        <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">

          {classes.map((item, index) => (
            <Link
              key={item}
              href={`/books?class=${encodeURIComponent(item)}`}
              className="group overflow-hidden rounded-3xl bg-white shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >

              <div
                className={`bg-gradient-to-r ${
                  colors[index % colors.length]
                } p-6 text-white`}
              >

                <GraduationCap
                  size={42}
                  className="mb-5 opacity-90"
                />

                <h3 className="text-2xl font-bold">
                  {item}
                </h3>

              </div>

              <div className="flex items-center justify-between p-6">

                <span className="font-semibold text-slate-700">
                  View Books
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