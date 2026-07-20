"use client";

import { Star } from "lucide-react";

interface BookFeaturesProps {
  features: string[];
}

export default function BookFeatures({ features }: BookFeaturesProps) {
  if (!features.length) return null;

  return (
    <section className="py-8">

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

        <span className="inline-flex rounded-full bg-violet-100 px-4 py-1 text-sm font-semibold text-violet-700">
          BOOK FEATURES
        </span>

        <h2 className="mt-4 text-3xl font-bold text-slate-900">
          Why Teachers Choose This Book
        </h2>

        <p className="mt-2 text-slate-600">
          Carefully designed to make classroom teaching engaging,
          practical and effective.
        </p>

        <div className="mt-8 divide-y divide-slate-100">

          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-4 py-4 transition hover:bg-violet-50"
            >

              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100">

                <Star
                  size={18}
                  className="fill-violet-600 text-violet-600"
                />

              </div>

              <p className="text-[15px] font-medium leading-6 text-slate-700">
                {feature}
              </p>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}