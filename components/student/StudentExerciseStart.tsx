"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentExerciseStart({
  bookId,
  chapterId,
  exerciseId,
  label = "Start Exercise",
}: {
  bookId: string;
  chapterId: string;
  exerciseId: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function start() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/student/exercises/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId, exerciseId }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        attemptId?: string;
        message?: string;
      };
      if (!response.ok || !result.attemptId) throw new Error(result.message);
      router.push(`/student-dashboard/exercises/${result.attemptId}`);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "This exercise is not available for your account.",
      );
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void start()}
        className="min-h-12 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-60"
      >
        {busy ? "Opening..." : label}
      </button>
      <p aria-live="polite" className="mt-3 text-sm font-semibold text-red-700">
        {message}
      </p>
    </div>
  );
}
