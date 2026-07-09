"use client";

import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Anita Sharma",
    role: "Science Teacher",
    school: "Delhi Public School",
    message:
      "Bluegate's lesson plans and worksheets have significantly reduced my preparation time while making classroom teaching more engaging.",
  },
  {
    name: "Rajesh Kumar",
    role: "Mathematics Teacher",
    school: "St. Xavier's School",
    message:
      "The PowerPoint presentations and question banks are well structured and perfectly aligned with classroom teaching requirements.",
  },
  {
    name: "Neha Verma",
    role: "Academic Coordinator",
    school: "Green Valley School",
    message:
      "Bluegate Teacher Hub has become an essential academic support platform for our teachers. The quality of resources is excellent.",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-slate-50 py-20">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto mb-16 max-w-3xl text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
            TEACHER TESTIMONIALS
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Trusted by Teachers Across India
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            Thousands of educators rely on Bluegate Publishers for
            high-quality teaching resources and classroom support.
          </p>

        </div>

        <div className="grid gap-8 lg:grid-cols-3">

          {testimonials.map((item) => (

            <div
              key={item.name}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
            >

              <Quote
                size={36}
                className="text-blue-600"
              />

              <div className="mt-6 flex">

                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={18}
                    className="fill-yellow-400 text-yellow-400"
                  />
                ))}

              </div>

              <p className="mt-6 leading-8 text-slate-600">
                "{item.message}"
              </p>

              <div className="mt-8 flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">

                  {item.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}

                </div>

                <div>

                  <h4 className="font-bold text-slate-900">
                    {item.name}
                  </h4>

                  <p className="text-sm text-slate-500">
                    {item.role}
                  </p>

                  <p className="text-sm font-medium text-blue-700">
                    {item.school}
                  </p>

                </div>

              </div>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}