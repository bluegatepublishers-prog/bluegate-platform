import {
  Lightbulb,
  GraduationCap,
  HeartHandshake,
  Users,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const values = [
  {
    title: "Excellence",
    icon: GraduationCap,
    color: "bg-blue-50",
    iconColor: "text-blue-600",
    description:
      "We strive for excellence in every educational resource we create, ensuring quality, accuracy and meaningful learning experiences.",
  },
  {
    title: "Innovation",
    icon: Lightbulb,
    color: "bg-yellow-50",
    iconColor: "text-yellow-600",
    description:
      "We embrace creativity, technology and modern teaching methodologies to prepare learners for the future.",
  },
  {
    title: "Integrity",
    icon: ShieldCheck,
    color: "bg-green-50",
    iconColor: "text-green-600",
    description:
      "We believe in honesty, transparency and ethical publishing practices that build lasting trust with schools and educators.",
  },
  {
    title: "Collaboration",
    icon: Users,
    color: "bg-purple-50",
    iconColor: "text-purple-600",
    description:
      "Strong partnerships with teachers, schools and academic experts help us deliver impactful educational solutions.",
  },
  {
    title: "Student First",
    icon: HeartHandshake,
    color: "bg-pink-50",
    iconColor: "text-pink-600",
    description:
      "Every decision we make is guided by one goal—to help every learner discover their full potential.",
  },
  {
    title: "Lifelong Learning",
    icon: Sparkles,
    color: "bg-orange-50",
    iconColor: "text-orange-600",
    description:
      "We inspire curiosity, critical thinking and continuous learning beyond the classroom.",
  },
];

export default function CoreValues() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}

        <div className="text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-[#0B5ED7]">
            OUR VALUES
          </span>

          <h2 className="mt-6 text-5xl font-bold text-[#083A75]">
            What We Believe In
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Our core values define who we are and guide every decision we make.
            They inspire us to create educational resources that make a lasting
            impact on students, teachers and schools.
          </p>

        </div>

        {/* Cards */}

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          {values.map((value) => {
            const Icon = value.icon;

            return (
              <div
                key={value.title}
                className="group rounded-[30px] border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl"
              >

                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-2xl ${value.color}`}
                >
                  <Icon
                    size={38}
                    className={value.iconColor}
                  />
                </div>

                <h3 className="mt-8 text-3xl font-bold text-[#083A75]">
                  {value.title}
                </h3>

                <p className="mt-5 leading-8 text-gray-600">
                  {value.description}
                </p>

              </div>
            );
          })}

        </div>

      </div>

    </section>
  );
}