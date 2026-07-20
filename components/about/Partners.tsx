import {
  School,
  Users,
  MapPinned,
  Handshake,
  BookOpen,
  GraduationCap,
} from "lucide-react";

const partners = [
  {
    title: "Partner Schools",
    description:
      "Building long-term relationships with schools across India through quality educational resources.",
    icon: School,
    color: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Educators Network",
    description:
      "Working closely with principals, teachers and academic coordinators to improve classroom learning.",
    icon: Users,
    color: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    title: "Nationwide Presence",
    description:
      "Serving schools in multiple states with curriculum-based books and learning solutions.",
    icon: MapPinned,
    color: "bg-yellow-50",
    iconColor: "text-yellow-600",
  },
  {
    title: "Trusted Collaboration",
    description:
      "Growing through strong partnerships based on quality, service and continuous academic support.",
    icon: Handshake,
    color: "bg-pink-50",
    iconColor: "text-pink-600",
  },
];

export default function Partners() {
  return (
    <section className="bg-[#F8FBFF] py-24">

      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}

        <div className="text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-[#0B5ED7]">
            OUR PARTNERS
          </span>

          <h2 className="mt-6 text-5xl font-bold text-[#083A75]">
            Trusted by Schools & Educators
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Bluegate Publishers proudly collaborates with schools,
            educators and academic institutions to provide innovative,
            curriculum-aligned learning resources that empower students
            and teachers alike.
          </p>

        </div>

        {/* Cards */}

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">

          {partners.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-[30px] bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${item.color}`}
                >
                  <Icon
                    size={32}
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

        {/* Bottom CTA */}

        <div className="mt-20 rounded-[32px] bg-gradient-to-r from-[#083A75] to-[#0B5ED7] p-12 text-center text-white">

          <BookOpen
            size={60}
            className="mx-auto text-yellow-300"
          />

          <h3 className="mt-6 text-4xl font-bold">
            Become a Bluegate Partner School
          </h3>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-blue-100">
            Join a growing network of schools that trust Bluegate
            Publishers for quality educational books, innovative
            teaching resources and future-ready learning solutions.
          </p>

          <div className="mt-10 inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-[#083A75] shadow-lg">

            <GraduationCap size={24} />

            Let&rsquo;s Grow Together

          </div>

        </div>

      </div>

    </section>
  );
}