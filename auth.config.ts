import type { NextAuthConfig } from "next-auth";

export default {
  // Runtime authentication is defined in auth.ts. Keeping this unused legacy
  // config provider-free prevents obsolete credential material from returning.
  providers: [],

  pages: {
    signIn: "/teacher-login",
  },

  session: {
    strategy: "jwt",
  },

} satisfies NextAuthConfig;
