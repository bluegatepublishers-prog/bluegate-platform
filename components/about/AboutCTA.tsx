import Link from "next/link";
import { BookOpen, PhoneCall } from "lucide-react";

export default function AboutCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#083A75] via-[#0B5ED7] to-[#1E88E5] py-24 text-white">

      {/* Background Decoration */}

      <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"></div>
      <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl"></div>

      <div className="mx-auto max-w-7xl px-6 text-center">

          <span className="rounded-full bg-white/20 px-5 py-2 text-sm font-semibold tracking-wide">
          LET&rsquo;S BUILD THE FUTURE OF EDUCATION
        </span>

        <h2 className="mt-8 text-5xl font-bold leading-tight">
          Partner with
          <span className="text-yellow-300"> Bluegate Publishers</span>
        </h2>

        <p className="mx-auto mt-8 max-w-3xl text-xl leading-9 text-blue-100">
          Together, we can create engaging learning experiences that inspire
          students, empower teachers and support schools with innovative,
          curriculum-aligned educational resources.
        </p>

        {/* Buttons */}

        <div className="mt-12 flex flex-wrap justify-center gap-6">

          <Link
            href="/books"
            className="flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-[#083A75] shadow-lg transition duration-300 hover:scale-105"
          >
            <BookOpen size={22} />
            Explore Our Books
          </Link>

          <Link
            href="/contact"
            className="flex items-center gap-3 rounded-xl border-2 border-white px-8 py-4 text-lg font-semibold transition duration-300 hover:bg-white hover:text-[#083A75]"
          >
            <PhoneCall size={22} />
            Contact Our Team
          </Link>

        </div>

        {/* Bottom Stats */}

        <div className="mt-20 grid gap-10 md:grid-cols-4">

          <div>
            <h3 className="text-4xl font-bold text-yellow-300">
              100+
            </h3>

            <p className="mt-2 text-blue-100">
              Educational Books
            </p>
          </div>

          <div>
            <h3 className="text-4xl font-bold text-yellow-300">
              500+
            </h3>

            <p className="mt-2 text-blue-100">
              Partner Schools
            </p>
          </div>

          <div>
            <h3 className="text-4xl font-bold text-yellow-300">
              10+
            </h3>

            <p className="mt-2 text-blue-100">
              Years of Experience
            </p>
          </div>

          <div>
            <h3 className="text-4xl font-bold text-yellow-300">
              1 Lakh+
            </h3>

            <p className="mt-2 text-blue-100">
              Students Reached
            </p>
          </div>

        </div>

      </div>

    </section>
  );
}