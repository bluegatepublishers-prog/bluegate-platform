"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentAssessmentStart({ assessmentId, label = "Start Assessment" }: { assessmentId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function start() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/student/assessments/${assessmentId}/start`, { method: "POST" });
      const result = await response.json() as { ok?: boolean; attemptId?: string; message?: string };
      if (!response.ok || !result.ok || !result.attemptId) throw new Error(result.message);
      router.push(`/student-dashboard/assessment-attempts/${result.attemptId}`);
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : "This assessment is not available for your account.");
      setBusy(false);
    }
  }
  return <div><button type="button" disabled={busy} onClick={() => void start()} className="min-h-12 rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white disabled:opacity-50">{busy ? "Opening…" : label}</button><p aria-live="polite" className="mt-2 text-sm font-semibold text-red-700">{message}</p></div>;
}
