"use client";

import { Save } from "lucide-react";

interface MasterFormProps {
  title: string;
  name: string;
  code: string;
  sortOrder: number;
  active: boolean;

  setName: (v: string) => void;
  setCode: (v: string) => void;
  setSortOrder: (v: number) => void;
  setActive: (v: boolean) => void;

  onSubmit: (
    e: React.FormEvent<HTMLFormElement>
  ) => void;

  loading: boolean;
}

export default function MasterForm({
  title,
  name,
  code,
  sortOrder,
  active,
  setName,
  setCode,
  setSortOrder,
  setActive,
  onSubmit,
  loading,
}: MasterFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div className="space-y-6">
        <div>
          <label className="mb-2 block font-semibold">
            Name
          </label>

          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            className="w-full rounded-xl border px-4 py-3"
            placeholder={title}
          />
        </div>

        <div>
          <label className="mb-2 block font-semibold">
            Code
          </label>

          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase())
            }
            className="w-full rounded-xl border px-4 py-3"
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
        disabled={loading}
        className="mt-8 inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        <Save className="mr-2 h-5 w-5" />

        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
}