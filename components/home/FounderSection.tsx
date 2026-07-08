import Image from "next/image";
import Link from "next/link";
import { Quote, ArrowRight, Award, BookOpen, School } from "lucide-react";

export default function FounderSection() {
  return (
    <section className="bg-gradient-to-br from-slate-50 via-white to-blue-50 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">

        {/* Founder Photo */}

        <div className="relative flex justify-center">

          <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-blue-100 blur-3xl" />

          <div className="absolute -bottom-6 -right-6 h-40 w-40 rounded-full bg-orange-100 blur-3xl" />

          <div className="overflow-hidden rounded-[40px] bg-white p-4 shadow-2xl">

            <Image
              src="/images/founder.jpg"
              alt="Founder"
              width={450}
              height={550}
              className="rounded-[30px] object-cover"
            />

          </div>

        </div>

        {/* Content */}

        <div>

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
            Message from the Founder
          </span>

          <div className="mt-6">

            <Quote
              size={55}
              className="text-blue-600"
            />

          </div>

          <h2 className="mt-6 text-5xl font-bold leading-tight text-slate-900">
            Building the Future of
            <span className="text-blue-600">
              {" "}
              Education
            </span>
          </h2>

          <p className="mt-8 text-lg leading-9 text-slate-600">
            At Bluegate Publishers, we believe every child deserves
            high-quality learning resources that inspire curiosity,
            creativity and confidence.

            <br /><br />

            Our mission is to empower teachers and schools with
            innovative books aligned with NEP 2020, combining strong
            pedagogy with engaging learning experiences.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">

            <div className="rounded-2xl bg-white p-5 text-center shadow-lg">

              <Award className="mx-auto mb-3 text-blue-600" />

              <h3 className="text-xl font-bold">
                15+
              </h3>

              <p className="text-sm text-slate-500">
                Years Experience
              </p>

            </div>

            <div className="rounded-2xl bg-white p-5 text-center shadow-lg">

              <BookOpen className="mx-auto mb-3 text-orange-600" />

              <h3 className="text-xl font-bold">
                100+
              </h3>

              <p className="text-sm text-slate-500">
                Educational Books
              </p>

            </div>

            <div className="rounded-2xl bg-white p-5 text-center shadow-lg">

              <School className="mx-auto mb-3 text-green-600" />

              <h3 className="text-xl font-bold">
                500+
              </h3>

              <p className="text-sm text-slate-500">
                Partner Schools
              </p>

            </div>

          </div>

          <div className="mt-10">

            <h3 className="text-2xl font-bold text-slate-900">
              Mr. Mukul Sharma
            </h3>

            <p className="text-blue-600 font-semibold">
              Founder & Managing Director
            </p>

          </div>

          <Link
            href="/about"
            className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white transition hover:bg-blue-700"
          >
            Read Our Story

            <ArrowRight size={20} />

          </Link>

        </div>

      </div>
    </section>
  );
}