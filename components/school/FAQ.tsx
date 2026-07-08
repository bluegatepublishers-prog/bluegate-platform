"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Which boards are your books aligned with?",
    answer:
      "Our publications are designed to align with CBSE, NEP 2020 and can be adapted for other school boards where applicable.",
  },
  {
    question: "Do you provide teacher training?",
    answer:
      "Yes. We offer orientation sessions, teaching guides, lesson planning support and continuous academic assistance.",
  },
  {
    question: "Do your books include digital resources?",
    answer:
      "Yes. Many of our books include QR codes, digital content, videos and online teacher resources.",
  },
  {
    question: "Can schools request inspection copies?",
    answer:
      "Absolutely. Schools and teachers can request inspection copies directly through our website.",
  },
  {
    question: "How can our school partner with Bluegate?",
    answer:
      "Simply contact our academic team. We'll guide you through consultation, book selection, implementation and ongoing support.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-6">

        <div className="text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Frequently Asked Questions
          </span>

          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Have Questions?
          </h2>

          <p className="mt-4 text-lg text-slate-600">
            Here are some common questions schools ask before partnering with us.
          </p>

        </div>

        <div className="mt-14 space-y-5">

          {faqs.map((faq, index) => (

            <div
              key={index}
              className="overflow-hidden rounded-2xl border bg-white shadow-sm"
            >

              <button
                onClick={() =>
                  setOpen(open === index ? null : index)
                }
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >

                <h3 className="text-lg font-semibold">
                  {faq.question}
                </h3>

                <ChevronDown
                  className={`transition ${
                    open === index ? "rotate-180" : ""
                  }`}
                />

              </button>

              {open === index && (

                <div className="border-t px-6 py-5 text-slate-600 leading-7">

                  {faq.answer}

                </div>

              )}

            </div>

          ))}

        </div>

      </div>
    </section>
  );
}