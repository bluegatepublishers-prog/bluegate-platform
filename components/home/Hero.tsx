export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
      <div className="mx-auto flex min-h-[85vh] max-w-7xl items-center px-6">

        {/* Left Side */}
        <div className="w-1/2">

          <p className="mb-4 text-yellow-300 font-semibold uppercase tracking-widest">
            Since 2018
          </p>

          <h1 className="text-6xl font-extrabold leading-tight">
            Shaping Tomorrow's Learners
          </h1>

          <h2 className="mt-3 text-4xl font-semibold">
            Through Quality Education
          </h2>

          <p className="mt-8 text-xl leading-9 text-blue-100">
            Bluegate Publishers develops curriculum-aligned books and
            educational solutions from Nursery to Class XII, helping
            schools inspire knowledge, creativity, confidence and values.
          </p>

          <div className="mt-10 flex gap-5">

            <button className="rounded-xl bg-yellow-400 px-8 py-4 font-bold text-black hover:bg-yellow-300">
              Explore Books
            </button>

            <button className="rounded-xl border-2 border-white px-8 py-4 hover:bg-white hover:text-blue-700">
              Request Catalogue
            </button>

          </div>

        </div>

        {/* Right Side */}
        <div className="flex w-1/2 justify-center">

          <div className="rounded-3xl bg-white p-8 shadow-2xl">

            <div className="flex h-96 w-72 items-center justify-center rounded-2xl bg-slate-100">

              <h3 className="text-2xl font-bold text-blue-700">
                Bluegate Book Collection
              </h3>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}