"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  removeSchoolTeacherAssignments,
  type AssignmentActionResult,
} from "@/app/school-dashboard/teacher-assignments/actions";

const initialState: AssignmentActionResult = { ok: true, message: "" };

export default function SchoolTeacherAssignmentRemoveButton({
  teacherId,
  sectionId,
}: {
  teacherId: string;
  sectionId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(removeSchoolTeacherAssignments, initialState);

  useEffect(() => {
    if (state.ok && state.message) router.refresh();
  }, [router, state]);

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={formAction}>
        <input type="hidden" name="teacherId" value={teacherId} />
        <input type="hidden" name="sectionId" value={sectionId} />
        <button disabled={pending} className="font-bold text-rose-700 hover:underline disabled:opacity-60">{pending ? "Removing..." : "Remove"}</button>
      </form>
      {state.ok && state.message ? <span role="status" aria-live="polite" className="text-xs font-semibold text-emerald-700">{state.message}</span> : null}
      {!state.ok ? <span role="alert" className="max-w-48 text-xs font-semibold text-rose-700">{state.message}</span> : null}
    </div>
  );
}
