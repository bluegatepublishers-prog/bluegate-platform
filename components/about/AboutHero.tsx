import Link from "next/link";

export default function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#083A75] via-[#0B5ED7] to-[#4F8EF7] py-28 text-white">
      {/* Background Decoration */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"></div>

      <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-yellow-400/20 blur-3xl"></div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left */}
          <div>
            <span className="inline-block rounded-full bg-white/20 px-5 py-2 text-sm tracking-wider backdrop-blur-sm">
              ABOUT BLUEGATE PUBLISHERS
            </span>

            <h1 className="mt-8 text-6xl font-bold leading-tight">
              Building
              <span className="text-yellow-300"> Knowledge,</span>
              <br />
              Inspiring Futures
            </h1>

            <p className="mt-8 max-w-xl text-xl leading-9 text-blue-100">
              Bluegate Publishers is committed to delivering high-quality
              educational books and innovative learning solutions that empower
              schools, teachers and students across India.
            </p>

            <div className="mt-10">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-xl border border-white px-8 py-4 font-semibold transition-all duration-300 hover:bg-white hover:text-[#083A75]"
              >
                Contact Us
              </Link>
            </div>
          </div>

          {/* Right */}
          <div>
            <div className="rounded-[40px] bg-white/10 p-8 backdrop-blur-lg">
              <div className="rounded-3xl bg-white p-10 text-slate-800 shadow-2xl">
                <h3 className="text-3xl font-bold text-[#083A75]">
                  Since 2018
                </h3>

                <p className="mt-6 leading-8 text-gray-600">
                  Bluegate Publishers has been creating curriculum-aligned
                  educational content designed to nurture curiosity,
                  creativity, values and lifelong learning.
                </p>

                <div className="mt-10 grid grid-cols-2 gap-6">
                  <div>
                    <h2 className="text-4xl font-bold text-[#0B5ED7]">100+</h2>
                    <p className="mt-2 text-gray-500">Books</p>
                  </div>

                  <div>
                    <h2 className="text-4xl font-bold text-[#0B5ED7]">500+</h2>
                    <p className="mt-2 text-gray-500">Schools</p>
                  </div>

                  <div>
                    <h2 className="text-4xl font-bold text-[#0B5ED7]">10+</h2>
                    <p className="mt-2 text-gray-500">Years Experience</p>
                  </div>

                  <div>
                    <h2 className="text-4xl font-bold text-[#0B5ED7]">1L+</h2>
                    <p className="mt-2 text-gray-500">Students</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* End Right */}
        </div>
      </div>
    </section>
  );
}