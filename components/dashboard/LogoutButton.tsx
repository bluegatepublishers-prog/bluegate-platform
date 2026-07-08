"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({
  className = "",
}: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await signOut({
        callbackUrl: "/teacher-login",
      });
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={`flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <LogOut className="mr-2 h-5 w-5" />

      {isPending ? "Signing Out..." : "Logout"}
    </button>
  );
}