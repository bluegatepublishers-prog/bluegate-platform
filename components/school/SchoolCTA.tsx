"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function SchoolCTA() {
  return (
    <section className="py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="overflow-hidden rounded-[40px] bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-500 p-14 text-center text-white shadow-2xl">

          <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
            Become a Bluegate Partner
          </span>

          <h2 className="mt-8 text-5xl font-bold">
            Let's Build Better Learning Together
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-xl leading-8 text-blue-100">
            Partner with Bluegate Publishers to provide your students
            and teachers with high-quality educational resources,
            teacher support and future-ready learning solutions.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-5">

            <Link
              href="/contact"
              className="rounded-2xl bg-white px-8 py-4 font-semibold text-blue-700 transition hover:bg-slate-100"
            >
              Contact Our Team
            </Link>

            <Link
              href="/books"
              className="flex items-center gap-2 rounded-2xl border border-white px-8 py-4 font-semibold transition hover:bg-white/10"
            >
              Browse Books
              <ArrowRight size={20} />
            </Link>

          </div>

        </div>

      </div>

    </section>
  );
}