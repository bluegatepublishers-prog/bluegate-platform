import Image from "next/image";
import Link from "next/link";
import { Quote } from "lucide-react";

export default function Leadership() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}

        <div className="text-center">

          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-[#0B5ED7]">
            LEADERSHIP MESSAGE
          </span>

          <h2 className="mt-6 text-5xl font-bold text-[#083A75]">
            A Message from Our Leadership
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            At Bluegate Publishers, every book is created with a commitment to
            inspire curiosity, build confidence and prepare students for the
            future.
          </p>

        </div>

        {/* Content */}

        <div className="mt-20 grid items-center gap-16 lg:grid-cols-2">

          {/* Left */}

          <div className="relative">

            <div className="overflow-hidden rounded-[36px] bg-gradient-to-br from-blue-50 to-slate-100 p-6 shadow-xl">

              <Image
                src="/team/founder.jpg"
                alt="Founder"
                width={550}
                height={650}
                className="rounded-3xl object-cover"
              />

            </div>

          </div>

          {/* Right */}

          <div>

            <Quote
              size={60}
              className="text-[#0B5ED7]"
            />

            <h3 className="mt-6 text-4xl font-bold text-[#083A75]">
              Education Shapes the Future
            </h3>

            <p className="mt-8 text-lg leading-9 text-gray-600">
  At Bluegate Publishers, our vision has always been to create educational
  resources that go beyond textbooks. We believe every child deserves learning
  experiences that are engaging, practical and future-ready.
</p>

<p className="mt-6 text-lg leading-9 text-gray-600">
  Our team works closely with educators, curriculum experts and schools to
  develop books that nurture curiosity, creativity and critical thinking while
  remaining aligned with the latest educational standards.
</p>

<p className="mt-6 text-lg leading-9 text-gray-600">
  We are grateful for the trust placed in Bluegate Publishers by schools,
  teachers and parents across India. Together, we are shaping confident
  learners and responsible citizens for tomorrow.
</p>

            <div className="mt-10">

              <h4 className="text-3xl font-bold text-[#083A75]">
  Vikas Sharma
</h4>

<p className="mt-2 text-lg font-medium text-[#0B5ED7]">
  Founder & Managing Director
</p>

<p className="mt-4 italic text-gray-500">
  "Education is not just about books—it is about inspiring young minds,
  building confidence and preparing every child for the opportunities of tomorrow."
</p>

            </div>

            <div className="mt-10">

              <Link
                href="/contact"
                className="rounded-xl bg-[#0B5ED7] px-8 py-4 font-semibold text-white transition hover:bg-[#083A75]"
              >
                Connect With Us
              </Link>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}