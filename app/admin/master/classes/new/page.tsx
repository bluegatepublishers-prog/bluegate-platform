"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function NewClassPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [active, setActive] = useState(true);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          code,
          sortOrder,
          active,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      alert("Class created successfully.");

      router.push("/admin/master/classes");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/admin/master/classes"
          className="inline-flex items-center text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classes
        </Link>

        <h1 className="mt-4 text-3xl font-bold">
          Add Class
        </h1>

        <p className="mt-2 text-slate-600">
          Create a new academic class.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border bg-white p-8 shadow-sm"
      >
        <div className="space-y-6">
          <div>
            <label className="mb-2 block font-semibold">
              Class Name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Class 6"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Class Code
            </label>

            <input
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase())
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="CLASS_6"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Sort Order
            </label>

            <input
              type="number"
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(Number(e.target.value))
              }
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) =>
                setActive(e.target.checked)
              }
            />

            <span>Active</span>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            disabled={loading}
            className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="mr-2 h-5 w-5" />

            {loading ? "Saving..." : "Save Class"}
          </button>

          <Link
            href="/admin/master/classes"
            className="rounded-xl border px-6 py-3 font-semibold"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}