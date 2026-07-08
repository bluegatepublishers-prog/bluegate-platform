import { CheckCircle2 } from "lucide-react";

const features = [
  "NEP 2020 Aligned",
  "Competency Based Learning",
  "Activity Based Exercises",
  "QR Code Digital Support",
  "Assessment Worksheets",
  "Teacher Resource Material",
];

export default function BookFeatures() {
  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-6">

        <h2 className="text-3xl font-bold text-slate-900">
          Book Features
        </h2>

        <p className="mt-3 text-slate-600">
          Carefully designed to make classroom learning more engaging.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

          {features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <CheckCircle2 className="text-emerald-600" size={22} />

              <span className="font-medium text-slate-700">
                {feature}
              </span>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
}