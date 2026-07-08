import {
  BookOpen,
  GraduationCap,
  Brain,
  MonitorSmartphone,
  FileCheck,
  Users,
  Sparkles,
  Handshake,
} from "lucide-react";

const features = [
  {
    title: "Curriculum-Aligned Books",
    icon: BookOpen,
    color: "bg-blue-50",
    iconColor: "text-blue-600",
    description:
      "Our books are carefully developed in line with NEP 2020 and major school curriculum frameworks, making learning structured and engaging.",
  },
  {
    title: "Experienced Academic Team",
    icon: GraduationCap,
    color: "bg-green-50",
    iconColor: "text-green-600",
    description:
      "Our authors, editors and subject experts bring years of educational experience to create high-quality learning resources.",
  },
  {
    title: "Future-Ready Learning",
    icon: Brain,
    color: "bg-purple-50",
    iconColor: "text-purple-600",
    description:
      "From Artificial Intelligence to Coding and Financial Literacy, we prepare students with skills for tomorrow.",
  },
  {
    title: "Digital Learning Support",
    icon: MonitorSmartphone,
    color: "bg-pink-50",
    iconColor: "text-pink-600",
    description:
      "Our learning ecosystem is designed to integrate print and digital resources for modern classrooms.",
  },
  {
    title: "Assessment Resources",
    icon: FileCheck,
    color: "bg-yellow-50",
    iconColor: "text-yellow-600",
    description:
      "Comprehensive worksheets, practice papers and assessments help teachers evaluate learning effectively.",
  },
  {
    title: "Teacher-Centric Approach",
    icon: Users,
    color: "bg-cyan-50",
    iconColor: "text-cyan-600",
    description:
      "We support educators with lesson planning, classroom activities and teaching resources beyond textbooks.",
  },
  {
    title: "Creative & Engaging Design",
    icon: Sparkles,
    color: "bg-orange-50",
    iconColor: "text-orange-600",
    description:
      "Beautiful layouts, rich illustrations and activity-based learning make every book enjoyable and effective.",
  },
  {
    title: "Trusted School Partner",
    icon: Handshake,
    color: "bg-emerald-50",
    iconColor: "text-emerald-600",
    description:
      "We believe in long-term partnerships with schools by delivering reliable educational solutions and dedicated support.",
  },
];

export default function WhyChoose() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}

        <div className="text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-[#0B5ED7]">
            WHY CHOOSE US
          </span>

          <h2 className="mt-6 text-5xl font-bold text-[#083A75]">
            Why Choose Bluegate Publishers?
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            We are committed to providing innovative educational solutions that
            combine academic excellence, modern pedagogy and future-ready
            learning to help schools, teachers and students succeed.
          </p>

        </div>

        {/* Cards */}

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">

          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-[30px] border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${feature.color}`}
                >
                  <Icon
                    size={32}
                    className={feature.iconColor}
                  />
                </div>

                <h3 className="mt-6 text-2xl font-bold text-[#083A75]">
                  {feature.title}
                </h3>

                <p className="mt-4 leading-7 text-gray-600">
                  {feature.description}
                </p>

              </div>
            );
          })}

        </div>

      </div>

    </section>
  );
}