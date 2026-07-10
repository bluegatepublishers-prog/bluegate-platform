"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import Link from "next/link";

interface TeacherActionsProps {
  teacherId: string;
  verified: boolean;
}

export default function TeacherActions({
  teacherId,
  verified,
}: TeacherActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleVerificationUpdate(verifiedState: boolean) {
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verified: verifiedState }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to update verification status.");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Teacher verification action failed:", error);
      alert("Unable to update verification status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href={`/admin/teachers/${teacherId}`}
        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Eye className="mr-2 h-4 w-4" />
        View
      </Link>

      <button
        type="button"
        disabled={loading}
        onClick={() => handleVerificationUpdate(!verified)}
        className="inline-flex items-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? (
          "Saving..."
        ) : verified ? (
          <>
            <XCircle className="mr-2 h-4 w-4" />
            Revoke
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve
          </>
        )}
      </button>
    </div>
  );
}
