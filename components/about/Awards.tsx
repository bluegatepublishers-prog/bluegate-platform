import {
  Award,
  Medal,
  BadgeCheck,
  Star,
} from "lucide-react";

const achievements = [
  {
    title: "Quality Educational Publishing",
    icon: Award,
    color: "bg-yellow-50",
    iconColor: "text-yellow-600",
    description:
      "Committed to creating high-quality curriculum-aligned educational resources for schools across India.",
  },
  {
    title: "Academic Excellence",
    icon: Medal,
    color: "bg-blue-50",
    iconColor: "text-blue-600",
    description:
      "Developing books that encourage critical thinking, creativity and meaningful classroom learning.",
  },
  {
    title: "Trusted School Partner",
    icon: BadgeCheck,
    color: "bg-green-50",
    iconColor: "text-green-600",
    description:
      "Working with schools and educators to deliver practical and future-ready learning solutions.",
  },
  {
    title: "Continuous Improvement",
    icon: Star,
    color: "bg-pink-50",
    iconColor: "text-pink-600",
    description:
      "Continuously improving our books and digital resources to meet the evolving needs of modern education.",
  },
];

export default function Awards() {
  return (
    <section className="bg-[#F8FBFF] py-24">

      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}

        <div className="text-center">

          <span className="rounded-full bg-yellow-100 px-5 py-2 text-sm font-semibold text-yellow-700">
            RECOGNITION
          </span>

          <h2 className="mt-6 text-5xl font-bold text-[#083A75]">
            Awards & Recognition
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Our greatest recognition comes from the trust of schools,
            teachers and students. As Bluegate continues to grow, we
            look forward to earning industry recognitions while
            remaining committed to educational excellence.
          </p>

        </div>

        {/* Cards */}

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">

          {achievements.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-[28px] bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >

                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${item.color}`}
                >
                  <Icon
                    size={34}
                    className={item.iconColor}
                  />
                </div>

                <h3 className="mt-6 text-2xl font-bold text-[#083A75]">
                  {item.title}
                </h3>

                <p className="mt-4 leading-7 text-gray-600">
                  {item.description}
                </p>

              </div>
            );
          })}

        </div>

        {/* Future Awards */}

        <div className="mt-20 rounded-[32px] border-2 border-dashed border-yellow-300 bg-yellow-50 p-10 text-center">

          <Award
            size={60}
            className="mx-auto text-yellow-500"
          />

          <h3 className="mt-6 text-3xl font-bold text-[#083A75]">
            More Achievements Ahead
          </h3>

          <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-gray-600">
            Bluegate Publishers is dedicated to continuous improvement,
            innovation and educational excellence. This section will
            proudly showcase our future awards, certifications,
            recognitions and institutional memberships as we continue
            our journey.
          </p>

        </div>

      </div>

    </section>
  );
}