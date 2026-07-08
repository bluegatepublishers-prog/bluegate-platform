"use client";

import { Trash2 } from "lucide-react";

interface DeleteButtonProps {
  onDelete: () => void;
}

export default function DeleteButton({
  onDelete,
}: DeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onDelete}
      className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}