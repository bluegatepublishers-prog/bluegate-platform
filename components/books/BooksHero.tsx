import {
  BookOpen,
  GraduationCap,
  School,
  Sparkles,
} from "lucide-react";

export default function BooksHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#083A75] via-[#0B5ED7] to-[#4F8EF7] text-white">

      {/* Background */}

      <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-white/10 blur-3xl"></div>

      <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-yellow-300/20 blur-3xl"></div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.18),transparent_35%)]"></div>

      <div className="relative mx-auto max-w-7xl px-6 py-24">

        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left */}

          <div>

            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-semibold backdrop-blur">

              <Sparkles size={16} />

              Bluegate Publishers Catalogue

            </div>

            <h1 className="mt-8 text-5xl font-bold leading-tight lg:text-6xl">
              Explore Books
              <span className="block text-yellow-300">
                That Inspire Learning
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-xl leading-9 text-blue-100">
              Discover curriculum-aligned books thoughtfully designed to
              empower schools, teachers and students with engaging,
              competency-based and future-ready learning experiences.
            </p>

            <div className="mt-12 grid max-w-2xl grid-cols-2 gap-5 md:grid-cols-4">

              <StatCard
                value="250+"
                label="Books"
              />

              <StatCard
                value="12"
                label="Subjects"
              />

              <StatCard
                value="1–12"
                label="Classes"
              />

              <StatCard
                value="500+"
                label="Schools"
              />

            </div>

          </div>

          {/* Right */}

          <div className="hidden lg:flex justify-center">

            <div className="relative">

              <div className="absolute -left-10 -top-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">

                <BookOpen
                  size={42}
                  className="text-yellow-300"
                />

              </div>

              <div className="absolute -right-10 top-16 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">

                <GraduationCap
                  size={42}
                  className="text-white"
                />

              </div>

              <div className="absolute bottom-0 -left-12 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">

                <School
                  size={42}
                  className="text-green-300"
                />

              </div>

              <div className="flex h-[420px] w-[420px] items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">

                <div className="flex h-72 w-72 items-center justify-center rounded-full bg-white">

                  <BookOpen
                    size={140}
                    className="text-[#0B5ED7]"
                  />

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}

function StatCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-center backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/20">

      <h3 className="text-3xl font-bold text-yellow-300">
        {value}
      </h3>

      <p className="mt-2 text-sm text-blue-100">
        {label}
      </p>

    </div>
  );
}