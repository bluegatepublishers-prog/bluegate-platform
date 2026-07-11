"use client";

import { usePathname } from "next/navigation";
import LoginHero from "@/components/auth/LoginHero";
import SchoolLoginHero from "@/components/auth/SchoolLoginHero";

export default function AuthLoginHero() {
  return usePathname() === "/school-login" ? <SchoolLoginHero /> : <LoginHero />;
}
