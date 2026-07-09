import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Laptop,
  ClipboardCheck,
  Brain,
  School,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";

const solutions = [
  {
    title: "Curriculum Books",
    description:
      "NEP 2020 aligned textbooks from Nursery to Class XII with competency-based learning and engaging classroom activities.",
    icon: BookOpen,
    color: "from-blue-500 to-cyan-500",
    href: "/books",
    tags: ["NEP 2020", "CBSE", "Activity Based"],
  },
  {
    title: "Teacher Training",
    description:
      "Professional development programmes, workshops and continuous academic support for teachers.",
    icon: GraduationCap,
    color: "from-emerald-500 to-green-600",
    href: "/teacher-hub",
    tags: ["Training", "Workshop", "Support"],
  },
  {
    title: "Digital Learning",
    description:
      "Interactive PPTs, videos, worksheets and digital classroom resources.",
    icon: Laptop,
    color: "from-violet-500 to-purple-600",
    href: "/teacher-hub",
    tags: ["Videos", "PPT", "Worksheets"],
  },
  {
    title: "Assessment Solutions",
    description:
      "Question banks, worksheets and competency-based assessments.",
    icon: ClipboardCheck,
    color: "from-orange-500 to-amber-500",
    href: "/contact",
    tags: ["Tests", "Question Bank", "Practice"],
  },
  {
    title: "AI & Future Skills",
    description:
      "Artificial Intelligence, Coding and Robotics programmes for future-ready learners.",
    icon: Brain,
    color: "from-pink-500 to-rose-500",
    href: "/school-solutions",
    tags: ["AI", "Coding", "Robotics"],
  },
  {
    title: "School Partnership",
    description:
      "Academic partnership with complete curriculum planning and school support.",
    icon: School,
    color: "from-sky-500 to-blue-700",
    href: "/contact",
    tags: ["Planning", "Academic", "Consultancy"],
  },
  {
    title: "Skill Development",
    description:
      "Life Skills, Value Education and Communication Skills programmes.",
    icon: HeartHandshake,
    color: "from-green-500 to-lime-500",
    href: "/school-solutions",
    tags: ["Life Skills", "Values", "Communication"],
  },
  {
    title: "Academic Excellence",
    description:
      "End-to-end academic mentoring for schools to improve learning outcomes.",
    icon: GraduationCap,
    color: "from-indigo-500 to-blue-600",
    href: "/contact",
    tags: ["Mentoring", "Innovation", "Results"],
  },
];

export default function EducationalSolutions() {
  return (
    <section className="bg-gradient-to-br from-slate-50 via-white to-blue-50 py-24">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto max-w-4xl text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
            Complete Educational Ecosystem
          </span>

          <h2 className="mt-6 text-5xl font-bold text-slate-900">
            Complete Educational Solutions
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Bluegate Publishers empowers schools with curriculum books,
            teacher training, digital resources, assessment support and
            future-ready learning programmes.
          </p>

        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
                    {solutions.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className={`bg-gradient-to-r ${item.color} p-8 text-white`}>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                    <Icon size={34} />
                  </div>

                  <h3 className="mt-6 text-2xl font-bold">
                    {item.title}
                  </h3>
                </div>

                <div className="p-7">
                  <p className="leading-7 text-slate-600">
                    {item.description}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={item.href}
                    className="mt-8 inline-flex items-center gap-2 font-semibold text-blue-700 transition hover:text-blue-900"
                  >
                    Learn More
                    <ArrowRight
                      size={18}
                      className="transition group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}

        <div className="mt-20 overflow-hidden rounded-[36px] bg-gradient-to-r from-[#083A75] via-blue-700 to-sky-600 p-12 text-white shadow-2xl">

          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">

            <div>

              <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                Partner with Bluegate Publishers
              </span>

              <h2 className="mt-6 text-4xl font-bold">
                Empower Your School with Complete Educational Solutions
              </h2>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-100">
                From curriculum books and teacher training to digital
                learning resources, assessments and future-ready
                skills, Bluegate Publishers is your trusted academic
                partner for holistic school education.
              </p>

            </div>

            <div className="flex flex-wrap gap-4">

              <Link
                href="/contact"
                className="rounded-2xl bg-white px-8 py-4 font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Request School Demo
              </Link>

              <Link
                href="/books"
                className="rounded-2xl border border-white/40 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
              >
                Explore Books
              </Link>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}