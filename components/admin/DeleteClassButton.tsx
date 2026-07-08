"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteClassButtonProps {
  id: string;
  name: string;
}

export default function DeleteClassButton({
  id,
  name,
}: DeleteClassButtonProps) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"?`
    );

    if (!confirmed) return;

    const response = await fetch(`/api/admin/classes/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Unable to delete class.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}