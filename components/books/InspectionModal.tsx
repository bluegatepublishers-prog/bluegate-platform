// InspectionModal.tsx
"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
import { Book } from "@/types/book";

interface InspectionModalProps {
  open: boolean;
  book: Book | null;
  onClose: () => void;
}

export default function InspectionModal({
  open,
  book,
  onClose,
}: InspectionModalProps) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    schoolName: "",
    schoolType: "",
    board: "",
    principalName: "",
    teacherName: "",
    designation: "",
    mobile: "",
    email: "",
    state: "",
    city: "",
    pinCode: "",
    address: "",
    interestedClasses: "",
    interestedSubjects: "",
    copiesRequired: "1",
    message: "",
    consent: false,
  });

  if (!open || !book) return null;

  const update = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((p) => ({
      ...p,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/inspection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          book,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Request submitted successfully.");
        onClose();
      } else {
        alert(data.message || "Unable to submit request.");
      }
    } catch {
      alert("Unable to connect to server.");
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-3xl font-bold">Request Inspection Copy</h2>
            <p className="mt-2 text-slate-500">
              Book: <strong>{book.title}</strong>
            </p>
          </div>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-8 p-8">
          <section>
            <h3 className="mb-4 text-xl font-semibold">School Information</h3>
            <div className="grid gap-5 md:grid-cols-2">
              <Input label="School Name *" name="schoolName" value={form.schoolName} onChange={update}/>
              <Input label="School Type" name="schoolType" value={form.schoolType} onChange={update}/>
              <Input label="Board" name="board" value={form.board} onChange={update}/>
              <Input label="Principal Name" name="principalName" value={form.principalName} onChange={update}/>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-xl font-semibold">Contact Person</h3>
            <div className="grid gap-5 md:grid-cols-2">
              <Input label="Teacher Name *" name="teacherName" value={form.teacherName} onChange={update}/>
              <Input label="Designation" name="designation" value={form.designation} onChange={update}/>
              <Input label="Mobile *" name="mobile" value={form.mobile} onChange={update}/>
              <Input label="Email *" name="email" value={form.email} onChange={update}/>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-xl font-semibold">Address</h3>
            <div className="grid gap-5 md:grid-cols-2">
              <Input label="State" name="state" value={form.state} onChange={update}/>
              <Input label="City" name="city" value={form.city} onChange={update}/>
              <Input label="PIN Code" name="pinCode" value={form.pinCode} onChange={update}/>
              <Input label="School Address" name="address" value={form.address} onChange={update}/>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-xl font-semibold">Requirement</h3>
            <div className="grid gap-5 md:grid-cols-2">
              <Input label="Interested Classes" name="interestedClasses" value={form.interestedClasses} onChange={update}/>
              <Input label="Interested Subjects" name="interestedSubjects" value={form.interestedSubjects} onChange={update}/>
              <Input label="Copies Required" name="copiesRequired" value={form.copiesRequired} onChange={update}/>
            </div>

            <div className="mt-5">
              <label className="mb-2 block font-medium">Message</label>
              <textarea
                name="message"
                value={form.message}
                onChange={update}
                rows={5}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <label className="mt-5 flex items-center gap-3">
              <input
                type="checkbox"
                name="consent"
                checked={form.consent}
                onChange={update}
              />
              I confirm that I represent a school/institution.
            </label>
          </section>

          <div className="flex justify-end">
            <button
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-white"
              disabled={loading}
            >
              <Send size={18}/>
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface InputProps {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
}

function Input({ label, name, value, onChange }: InputProps) {
  return (
    <div>
      <label className="mb-2 block font-medium">{label}</label>
      <input
        className="w-full rounded-xl border p-3"
        name={name}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
