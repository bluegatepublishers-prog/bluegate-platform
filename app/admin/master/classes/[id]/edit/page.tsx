"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function EditClassPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [active, setActive] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/classes/${id}`);
      const data = await res.json();

      setName(data.name);
      setCode(data.code);
      setSortOrder(data.sortOrder);
      setActive(data.active);

      setLoading(false);
    }

    load();
  }, [id]);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSaving(true);

    await fetch(`/api/admin/classes/${id}`, {
      method: "PUT",
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

    router.push("/admin/master/classes");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/admin/master/classes"
          className="inline-flex items-center text-blue-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>

        <h1 className="mt-4 text-3xl font-bold">
          Edit Class
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border bg-white p-8 shadow-sm"
      >
        <div className="space-y-6">
          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase())
            }
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            type="number"
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(Number(e.target.value))
            }
            className="w-full rounded-xl border px-4 py-3"
          />

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) =>
                setActive(e.target.checked)
              }
            />

            Active
          </label>
        </div>

        <button
          disabled={saving}
          className="mt-8 inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
        >
          <Save className="mr-2 h-5 w-5" />

          {saving ? "Updating..." : "Update Class"}
        </button>
      </form>
    </div>
  );
}