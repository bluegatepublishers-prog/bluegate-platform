"use client";

import { useMemo, useState } from "react";
import { teacherResources, Resource } from "@/data/teacherResourcesLocal";
import ResourceCard from "./ResourceCard";
import EmptyState from "./EmptyState";

export default function ResourceList() {
  const [query, setQuery] = useState("");
  const [classLevel, setClassLevel] = useState("All");
  const [subject, setSubject] = useState("All");
  const [type, setType] = useState("All");

  const classOptions = useMemo(() => {
    const set = new Set(teacherResources.map((r) => r.classLevel));
    return ["All", ...Array.from(set)];
  }, []);

  const subjectOptions = useMemo(() => {
    const set = new Set(teacherResources.map((r) => r.subject));
    return ["All", ...Array.from(set)];
  }, []);

  const typeOptions = useMemo(() => {
    const set = new Set(teacherResources.map((r) => r.type));
    return ["All", ...Array.from(set)];
  }, []);

  const results = teacherResources.filter((r) => {
    if (classLevel !== "All" && r.classLevel !== classLevel) return false;
    if (subject !== "All" && r.subject !== subject) return false;
    if (type !== "All" && r.type !== type) return false;
    if (query && !(`${r.title} ${r.description} ${r.subject} ${r.classLevel}`.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  });

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            placeholder="Search resources..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-4 py-2"
          />

          <select className="rounded-md border border-slate-200 bg-white px-4 py-2" value={classLevel} onChange={(e) => setClassLevel(e.target.value)}>
            {classOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select className="rounded-md border border-slate-200 bg-white px-4 py-2" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {subjectOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select className="rounded-md border border-slate-200 bg-white px-4 py-2" value={type} onChange={(e) => setType(e.target.value)}>
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            results.map((r: Resource) => <ResourceCard key={r.id} resource={r} />)
          )}
        </div>

      </div>
    </section>
  );
}
