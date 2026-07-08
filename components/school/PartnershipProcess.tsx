"use client";

import {
  PhoneCall,
  Users,
  BookOpen,
  GraduationCap,
  School,
  HeartHandshake,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Contact Bluegate",
    description:
      "Reach out to our academic team through our website, email or phone to discuss your school's requirements.",
    icon: PhoneCall,
    color: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    number: "02",
    title: "Academic Consultation",
    description:
      "Our education specialists understand your curriculum, board, grade levels and learning objectives.",
    icon: Users,
    color: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    number: "03",
    title: "Book Selection",
    description:
      "Choose the most suitable textbooks, teacher resources and digital learning materials for your school.",
    icon: BookOpen,
    color: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    number: "04",
    title: "Teacher Orientation",
    description:
      "Teachers receive orientation sessions, lesson planning guidance and implementation support.",
    icon: GraduationCap,
    color: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    number: "05",
    title: "School Implementation",
    description:
      "Books, assessments and digital resources are introduced into classrooms with continuous monitoring.",
    icon: School,
    color: "bg-pink-50",
    iconColor: "text-pink-600",
  },
  {
    number: "06",
    title: "Continuous Support",
    description:
      "Bluegate continues to support your school through updates, teacher training and academic assistance.",
    icon: HeartHandshake,
    color: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
];

export default function PartnershipProcess() {
  return (
    <section className="bg-slate-50 py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto max-w-3xl text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Partnership Journey
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Our School Partnership Process
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            From the first conversation to long-term academic support,
            we work closely with schools to ensure a smooth and successful implementation.
          </p>

        </div>

        <div className="relative mt-20">

          {/* Vertical line */}

          <div className="absolute left-8 top-0 hidden h-full w-1 rounded-full bg-blue-100 lg:block" />

          <div className="space-y-10">

            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="relative flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-sm transition hover:shadow-xl lg:flex-row lg:items-center"
                >

                  {/* Number */}

                  <div className="absolute -left-3 top-6 hidden lg:flex">

                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white shadow-lg">
                      {step.number}
                    </div>

                  </div>

                  {/* Icon */}

                  <div
                    className={`inline-flex rounded-2xl p-5 ${step.color}`}
                  >
                    <Icon
                      className={step.iconColor}
                      size={34}
                    />
                  </div>

                  {/* Content */}

                  <div className="lg:ml-6">

                    <h3 className="text-2xl font-bold text-slate-900">
                      {step.title}
                    </h3>

                    <p className="mt-4 leading-7 text-slate-600">
                      {step.description}
                    </p>

                  </div>

                </div>
              );
            })}

          </div>

        </div>

      </div>

    </section>
  );
}