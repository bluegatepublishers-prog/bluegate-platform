"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({
  value,
  onChange,
}: SearchBarProps) {
  return (
    <div className="mb-10">
      <div className="relative">

        <Search
          className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
          size={20}
        />

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by title, subject, class or series..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-14 pr-14 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        )}

      </div>
    </div>
  );
}