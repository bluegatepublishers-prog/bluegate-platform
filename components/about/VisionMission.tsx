import { Eye, Target } from "lucide-react";

export default function VisionMission() {
  return (
    <section className="bg-[#F8FBFF] py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}

        <div className="text-center">
          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-[#0B5ED7]">
            OUR PURPOSE
          </span>

          <h2 className="mt-6 text-5xl font-bold text-[#083A75]">
            Vision & Mission
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Our vision and mission guide every book we publish and every
            educational solution we create. They reflect our commitment to
            empowering schools, teachers, and students with quality learning
            experiences.
          </p>
        </div>

        {/* Cards */}

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          {/* Vision */}

          <div className="rounded-[32px] bg-[#FBCFE8] p-10 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F472B6]">
              <Eye size={38} className="text-[#9D174D]" />
            </div>

            <h3 className="mt-8 text-4xl font-bold text-[#083A75]">
              Our Vision
            </h3>

            <p className="mt-6 text-lg leading-8 text-gray-700">
              To become one of India's most trusted educational publishers by
              providing innovative, inclusive and future-ready learning
              solutions that inspire curiosity, creativity, critical thinking,
              and lifelong learning among every student.
            </p>
          </div>

          {/* Mission */}

          <div className="rounded-[32px] bg-gradient-to-br from-[#0B5ED7] to-[#083A75] p-10 text-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <Target size={38} className="text-white" />
            </div>

            <h3 className="mt-8 text-4xl font-bold">
              Our Mission
            </h3>

            <ul className="mt-8 space-y-5 text-lg leading-8 text-blue-100">
              <li>✔ Publish curriculum-aligned educational resources.</li>

              <li>✔ Empower teachers with practical teaching support.</li>

              <li>✔ Promote AI, Coding, Financial Literacy and Skill Education.</li>

              <li>✔ Foster creativity, innovation and ethical values.</li>

              <li>✔ Build long-term partnerships with schools across India.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}