"use client";

import { useState, type FormEvent } from "react";

type ContactState = {
  name: string;
  email: string;
  phone: string;
  schoolName: string;
  subject: string;
  message: string;
};

type FieldErrors = Partial<Record<keyof ContactState, string>>;

const initialState: ContactState = {
  name: "",
  email: "",
  phone: "",
  schoolName: "",
  subject: "General Enquiry",
  message: "",
};

export default function ContactForm() {
  const [form, setForm] = useState<ContactState>(initialState);
  const [pending, setPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function updateField(field: keyof ContactState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
    setSuccessMessage("");
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorMessage("");
    setSuccessMessage("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(result.message || "We could not send your message right now.");
        if (result.errors && typeof result.errors === "object") {
          setFieldErrors(result.errors);
        }
        return;
      }

      setSuccessMessage(result.message || "Your message was sent by email.");
      setForm(initialState);
    } catch {
      setErrorMessage("We could not send your message right now. Please try again later.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          maxLength={100}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
          className="w-full rounded-xl border border-gray-300 p-4 focus:border-blue-600 focus:outline-none"
        />
        {fieldErrors.name ? <p id="name-error" className="mt-2 text-sm text-red-600">{fieldErrors.name}</p> : null}
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          maxLength={254}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          className="w-full rounded-xl border border-gray-300 p-4 focus:border-blue-600 focus:outline-none"
        />
        {fieldErrors.email ? <p id="email-error" className="mt-2 text-sm text-red-600">{fieldErrors.email}</p> : null}
      </div>

      <div>
        <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-700">
          Mobile Number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={(event) => updateField("phone", event.target.value)}
          maxLength={30}
          className="w-full rounded-xl border border-gray-300 p-4 focus:border-blue-600 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="schoolName" className="mb-2 block text-sm font-medium text-slate-700">
          School / Organisation
        </label>
        <input
          id="schoolName"
          name="schoolName"
          type="text"
          value={form.schoolName}
          onChange={(event) => updateField("schoolName", event.target.value)}
          maxLength={100}
          aria-invalid={Boolean(fieldErrors.schoolName)}
          aria-describedby={fieldErrors.schoolName ? "school-error" : undefined}
          className="w-full rounded-xl border border-gray-300 p-4 focus:border-blue-600 focus:outline-none"
        />
        {fieldErrors.schoolName ? <p id="school-error" className="mt-2 text-sm text-red-600">{fieldErrors.schoolName}</p> : null}
      </div>

      <div>
        <label htmlFor="subject" className="mb-2 block text-sm font-medium text-slate-700">
          Enquiry Type
        </label>
        <select
          id="subject"
          name="subject"
          value={form.subject}
          onChange={(event) => updateField("subject", event.target.value)}
          className="w-full rounded-xl border border-gray-300 p-4 focus:border-blue-600 focus:outline-none"
        >
          <option>School Partnership</option>
          <option>Book Catalogue</option>
          <option>Teacher Resources</option>
          <option>Publishing</option>
          <option>General Enquiry</option>
        </select>
        {fieldErrors.subject ? <p className="mt-2 text-sm text-red-600">{fieldErrors.subject}</p> : null}
      </div>

      <div>
        <label htmlFor="message" className="mb-2 block text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          maxLength={5000}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? "message-error" : undefined}
          className="w-full rounded-xl border border-gray-300 p-4 focus:border-blue-600 focus:outline-none"
        />
        {fieldErrors.message ? <p id="message-error" className="mt-2 text-sm text-red-600">{fieldErrors.message}</p> : null}
      </div>

      {errorMessage ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#0B5ED7] py-4 text-lg font-semibold text-white transition hover:bg-[#083A75] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
