"use client";

import {
  Quote,
  Star,
  School,
  Users,
  Award,
} from "lucide-react";

const testimonials = [
  {
    name: "Dr. Rajesh Sharma",
    role: "Principal",
    school: "ABC Public School",
    quote:
      "Bluegate Publishers has transformed our classroom experience with engaging books and excellent teacher support.",
  },
  {
    name: "Mrs. Neha Verma",
    role: "Academic Coordinator",
    school: "Green Valley School",
    quote:
      "The competency-based resources and digital support have made lesson planning much easier for our teachers.",
  },
  {
    name: "Mr. Amit Singh",
    role: "Science Teacher",
    school: "Sunrise International School",
    quote:
      "Students love the activities, QR resources and practical learning approach used throughout the books.",
  },
];

const stats = [
  {
    icon: School,
    number: "100+",
    label: "Schools Supported",
  },
  {
    icon: Users,
    number: "500+",
    label: "Teachers Empowered",
  },
  {
    icon: Award,
    number: "50+",
    label: "Educational Titles",
  },
];

export default function PartnerTestimonials() {
  return (
    <section className="bg-slate-50 py-24">

      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}

        <div className="mx-auto max-w-3xl text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Trusted by Schools
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Schools & Teachers Speak
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            We believe long-term partnerships are built on trust,
            quality and continuous academic support.
          </p>

        </div>

        {/* Stats */}

        <div className="mt-16 grid gap-6 md:grid-cols-3">

          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-3xl bg-white p-8 text-center shadow-sm"
              >

                <div className="mx-auto inline-flex rounded-2xl bg-blue-50 p-4">

                  <Icon
                    className="text-blue-600"
                    size={34}
                  />

                </div>

                <h3 className="mt-5 text-4xl font-bold text-slate-900">
                  {item.number}
                </h3>

                <p className="mt-2 text-slate-600">
                  {item.label}
                </p>

              </div>
            );
          })}

        </div>

        {/* Testimonials */}

        <div className="mt-20 grid gap-8 lg:grid-cols-3">

          {testimonials.map((item) => (

            <div
              key={item.name}
              className="rounded-3xl bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
            >

              <Quote
                className="text-blue-600"
                size={34}
              />

              <div className="mt-5 flex">

                {[1, 2, 3, 4, 5].map((star) => (

                  <Star
                    key={star}
                    size={18}
                    className="fill-yellow-400 text-yellow-400"
                  />

                ))}

              </div>

              <p className="mt-6 leading-8 text-slate-600 italic">
                "{item.quote}"
              </p>

              <div className="mt-8 border-t pt-5">

                <h4 className="text-xl font-bold text-slate-900">
                  {item.name}
                </h4>

                <p className="text-slate-500">
                  {item.role}
                </p>

                <p className="font-medium text-blue-600">
                  {item.school}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}