"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { teacherFAQs } from "@/data/teacherResources";

export default function FAQ() {
  const [openId, setOpenId] = useState<string | null>("1");

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            <HelpCircle className="mr-2 h-4 w-4" />
            Frequently Asked Questions
          </span>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
            Have Questions?
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Find answers to the most commonly asked questions about the
            Bluegate Teacher Hub and teaching resources.
          </p>
        </div>

        {/* FAQ List */}
        <div className="mt-16 space-y-5">
          {teacherFAQs.map((faq) => (
            <div
              key={faq.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all"
            >
              <button
                onClick={() => toggleFAQ(faq.id)}
                className="flex w-full items-center justify-between p-6 text-left"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {faq.question}
                </h3>

                <ChevronDown
                  className={`h-5 w-5 text-slate-500 transition-transform duration-300 ${
                    openId === faq.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openId === faq.id && (
                <div className="border-t border-slate-100 px-6 pb-6 pt-4">
                  <p className="leading-7 text-slate-600">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Text */}
        <div className="mt-16 rounded-3xl bg-blue-600 p-10 text-center text-white">
          <h3 className="text-2xl font-bold">
            Still Need Assistance?
          </h3>

          <p className="mx-auto mt-4 max-w-2xl text-blue-100">
            Our academic support team is here to help you with teaching
            resources, book selection, downloads, and classroom guidance.
          </p>

          <a
            href="/contact"
            className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 transition hover:bg-slate-100"
          >
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}