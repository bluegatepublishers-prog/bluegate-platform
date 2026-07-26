"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { removeAssignmentAttachmentAction } from "@/app/teacher-dashboard/classes/[sectionId]/assignments/actions";

export default function RemoveAssignmentAttachmentButton({ sectionId, assignmentId, attachmentId, label }: { sectionId: string; assignmentId: string; attachmentId: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" disabled={pending} aria-label={`Remove ${label}`} onClick={() => {
    if (!window.confirm(`Remove ${label} from this assignment?`)) return;
    startTransition(async () => {
      const result = await removeAssignmentAttachmentAction(sectionId, assignmentId, attachmentId);
      if (result.ok) router.refresh();
    });
  }} className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700 disabled:opacity-50">Remove</button>;
}

