import {
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Laptop,
  Brain,
  HeartHandshake,
  Check,
} from "lucide-react";

const features = [
  {
    title: "NEP 2020 Aligned",
    description:
      "Curriculum designed according to the latest National Education Policy with competency-based learning.",
    icon: ShieldCheck,
    color: "text-blue-600",
    bg: "bg-blue-50",
    tags: ["NEP", "NCF", "CBSE"],
  },
  {
    title: "Competency Based",
    description:
      "Learning experiences focused on application, activities and conceptual understanding.",
    icon: BookOpen,
    color: "text-green-600",
    bg: "bg-green-50",
    tags: ["Activities", "Projects", "Learning"],
  },
  {
    title: "Teacher Resources",
    description:
      "Lesson plans, worksheets, presentations and classroom teaching support.",
    icon: GraduationCap,
    color: "text-orange-600",
    bg: "bg-orange-50",
    tags: ["Lesson Plan", "Worksheets", "PPT"],
  },
  {
    title: "Digital Learning",
    description:
      "Interactive digital resources designed for modern classrooms and blended learning.",
    icon: Laptop,
    color: "text-violet-600",
    bg: "bg-violet-50",
    tags: ["Videos", "Digital", "Interactive"],
  },
  {
    title: "Future Skills",
    description:
      "Artificial Intelligence, Coding, Robotics and Financial Literacy programmes.",
    icon: Brain,
    color: "text-pink-600",
    bg: "bg-pink-50",
    tags: ["AI", "Coding", "Robotics"],
  },
  {
    title: "Holistic Development",
    description:
      "Helping learners grow with communication skills, values and creativity.",
    icon: HeartHandshake,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    tags: ["Values", "Life Skills", "Confidence"],
  },
];

export default function WhyBluegate() {
  return (
    <section className="bg-white py-16">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto max-w-3xl text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            WHY BLUEGATE
          </span>

          <h2 className="mt-6 text-5xl font-bold text-[#083A75]">
            Everything Schools Need
            <br />
            For Better Learning
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Bluegate combines innovative textbooks,
            teacher support and digital learning
            resources to create engaging classroom
            experiences for every learner.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-2xl"
              >
                {/* Icon */}

                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${feature.bg} transition-transform duration-300 group-hover:rotate-6`}
                >
                  <Icon
                    size={30}
                    className={feature.color}
                  />
                </div>

                {/* Title */}

                <h3 className="mt-6 text-2xl font-bold text-slate-900">
                  {feature.title}
                </h3>

                {/* Description */}

                <p className="mt-4 leading-7 text-slate-600">
                  {feature.description}
                </p>

                {/* Tags */}

                <div className="mt-6 flex flex-wrap gap-2">

                  {feature.tags.map((tag) => (

                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {tag}
                    </span>

                  ))}

                </div>

                {/* Divider */}

                <div className="my-6 h-px bg-slate-200" />

                {/* Highlights */}

                <div className="space-y-3">

                  <div className="flex items-center gap-3 text-sm text-slate-600">

                    <Check
                      size={16}
                      className="text-emerald-500"
                    />

                    Quality Content

                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-600">

                    <Check
                      size={16}
                      className="text-emerald-500"
                    />

                    Classroom Ready

                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-600">

                    <Check
                      size={16}
                      className="text-emerald-500"
                    />

                    Teacher Friendly

                  </div>

                </div>

              </div>
            );
          })}

        </div>

      </div>

    </section>
  );
}