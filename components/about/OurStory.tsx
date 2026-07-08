import Link from "next/link";

export default function OurStory() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left Side */}

          <div>

            <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-[#0B5ED7]">
              OUR STORY
            </span>

            <h2 className="mt-6 text-5xl font-bold text-[#083A75] leading-tight">
              From Experience to Excellence
            </h2>

            <p className="mt-8 text-lg leading-8 text-gray-600">
              Every great institution begins with a purpose. Bluegate Publishers
              was founded with a simple yet powerful vision—to create educational
              resources that inspire learning, encourage curiosity, and prepare
              students for a successful future.
            </p>

            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our journey began long before Bluegate was established. Since
              2014, our team has been actively involved in educational content
              development, curriculum planning, book design, and publishing for
              some of India's leading educational organizations.
            </p>

            <p className="mt-6 text-lg leading-8 text-gray-600">
              In 2018, Bluegate Publishers was founded with a commitment to
              provide schools with curriculum-aligned books, teacher resources,
              and innovative learning solutions that combine academic excellence
              with strong values and practical skills.
            </p>

            <div className="mt-10">

              <Link
                href="/books"
                className="rounded-xl bg-[#0B5ED7] px-8 py-4 font-semibold text-white transition hover:bg-[#083A75]"
              >
                Explore Our Books
              </Link>

            </div>

          </div>

          {/* Right Side */}

          <div>

            <div className="rounded-[32px] bg-gradient-to-br from-[#F5FAFF] to-[#FFF8E8] p-10 shadow-xl">

              <h3 className="text-3xl font-bold text-[#083A75]">
                Our Journey
              </h3>

              <div className="mt-10 space-y-8">

                <div className="flex gap-5">

                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                    1
                  </div>

                  <div>

                    <h4 className="text-xl font-semibold">
                      2014
                    </h4>

                    <p className="mt-2 text-gray-600">
                      Started developing educational content, curriculum,
                      and textbooks for leading publishers.
                    </p>

                  </div>

                </div>

                <div className="flex gap-5">

                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500 text-xl font-bold text-white">
                    2
                  </div>

                  <div>

                    <h4 className="text-xl font-semibold">
                      2018
                    </h4>

                    <p className="mt-2 text-gray-600">
                      Bluegate Publishers was officially established to deliver
                      innovative and high-quality educational solutions.
                    </p>

                  </div>

                </div>

                <div className="flex gap-5">

                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                    3
                  </div>

                  <div>

                    <h4 className="text-xl font-semibold">
                      Today
                    </h4>

                    <p className="mt-2 text-gray-600">
                      Continuing our mission to support schools, teachers and
                      students through books, AI education, coding,
                      financial literacy and future-ready learning solutions.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}