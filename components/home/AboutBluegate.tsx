import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BookOpen,
  School,
  ArrowRight,
} from "lucide-react";

export default function AboutBluegate() {
  return (
    <section className="bg-gradient-to-br from-slate-50 via-white to-blue-50 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">

        {/* Left */}

        <div>

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            About Bluegate Publishers
          </span>

          <h2 className="mt-6 text-5xl font-bold leading-tight text-[#083A75]">
            Building the Future of
            <span className="text-blue-600"> Education</span>
          </h2>

          <p className="mt-8 text-lg leading-9 text-slate-600">
            Bluegate Publishers was established with a vision to
            transform school education through high-quality,
            competency-based learning resources aligned with
            NEP 2020 and the National Curriculum Framework.
          </p>

          <p className="mt-6 text-lg leading-9 text-slate-600">
            Our experienced academic team has been creating
            educational content for schools across India for
            more than a decade. Today, Bluegate is committed
            to supporting teachers, empowering learners and
            partnering with schools for academic excellence.
          </p>

          {/* Stats */}

          <div className="mt-10 grid grid-cols-3 gap-5">

            <div className="rounded-2xl bg-white p-5 text-center shadow-lg">

              <Award className="mx-auto mb-3 text-blue-600" />

              <h3 className="text-2xl font-bold">
                10+
              </h3>

              <p className="text-sm text-slate-500">
                Years Experience
              </p>

            </div>

            <div className="rounded-2xl bg-white p-5 text-center shadow-lg">

              <BookOpen className="mx-auto mb-3 text-orange-500" />

              <h3 className="text-2xl font-bold">
                100+
              </h3>

              <p className="text-sm text-slate-500">
                Books
              </p>

            </div>

            <div className="rounded-2xl bg-white p-5 text-center shadow-lg">

              <School className="mx-auto mb-3 text-emerald-600" />

              <h3 className="text-2xl font-bold">
                500+
              </h3>

              <p className="text-sm text-slate-500">
                Schools
              </p>

            </div>

          </div>

          {/* Buttons */}

          <div className="mt-10 flex flex-wrap gap-4">

            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-8 py-4 font-semibold text-white transition hover:bg-blue-800"
            >
              Read Our Story

              <ArrowRight size={18} />

            </Link>

            <Link
              href="/contact"
              className="rounded-xl border border-blue-700 px-8 py-4 font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Contact Us
            </Link>

          </div>

        </div>

        {/* Right */}

        <div className="relative">

          <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-blue-200 blur-3xl" />

          <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-yellow-200 blur-3xl" />

          <div className="overflow-hidden rounded-[40px] bg-white p-5 shadow-2xl">

            <Image
              src="/images/founder.jpg"
              alt="Founder"
              width={520}
              height={650}
              className="rounded-[30px] object-cover"
            />

            <div className="mt-6 rounded-2xl bg-slate-50 p-6">

              <h3 className="text-2xl font-bold text-slate-900">
                Vikas Sharma
              </h3>

              <p className="font-medium text-blue-700">
                Founder & Managing Director
              </p>

              <p className="mt-4 leading-7 text-slate-600 italic">
                &ldquo;Education is the most powerful investment in
                the future. Every child deserves inspiring
                books, every teacher deserves strong academic
                support, and every school deserves a trusted
                educational partner.&rdquo;
              </p>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}