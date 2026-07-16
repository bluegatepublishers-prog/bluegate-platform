"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentPracticeStart({ bookId, chapterId, label = "Start Practice" }: { bookId: string; chapterId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function start() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/student/practice/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookId, chapterId, requestedCount: 5 }) });
      const result = await response.json() as { ok?: boolean; attemptId?: string; message?: string };
      if (!response.ok || !result.attemptId) throw new Error(result.message);
      router.push(`/student-dashboard/practice/${result.attemptId}`);
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : "This practice activity is not available for your account.");
      setBusy(false);
    }
  }
  return <div><button type="button" disabled={busy} onClick={() => void start()} className="min-h-12 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60">{busy ? "Starting…" : label}</button><p aria-live="polite" className="mt-3 text-sm font-semibold text-red-700">{message}</p></div>;
}
