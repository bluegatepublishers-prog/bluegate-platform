import { BookOpen, GraduationCap } from "lucide-react";

export default function BooksHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#dbeafe,transparent_40%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8">

        <div className="max-w-3xl">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            <BookOpen size={18} />
            Bluegate Publishers Catalogue
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Discover Books That
            <span className="block text-blue-600">
              Inspire Learning
            </span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Browse our comprehensive collection of NEP-aligned,
            competency-based books carefully designed for modern
            classrooms, teachers, and young learners.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <div className="rounded-2xl bg-white px-6 py-4 shadow-md">
              <p className="text-3xl font-bold text-blue-600">250+</p>
              <p className="text-sm text-slate-600">Books Published</p>
            </div>

            <div className="rounded-2xl bg-white px-6 py-4 shadow-md">
              <p className="text-3xl font-bold text-emerald-600">12</p>
              <p className="text-sm text-slate-600">Subjects</p>
            </div>

            <div className="rounded-2xl bg-white px-6 py-4 shadow-md">
              <p className="text-3xl font-bold text-orange-500">1–12</p>
              <p className="text-sm text-slate-600">Classes</p>
            </div>

          </div>
        </div>

        <div className="absolute right-10 top-16 hidden xl:block">

          <div className="rounded-full bg-white p-8 shadow-xl">
            <GraduationCap
              className="text-blue-600"
              size={120}
            />
          </div>

        </div>

      </div>
    </section>
  );
}