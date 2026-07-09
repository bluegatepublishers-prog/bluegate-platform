import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export default {
  providers: [
    Credentials({
      name: "Teacher Login",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },

        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        /**
         * ===================================================
         * TEMPORARY LOGIN
         * ===================================================
         *
         * Replace this with PostgreSQL + Prisma later.
         */

        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (
          email === "teacher@bluegate.in" &&
          password === "123456"
        ) {
          return {
            id: "teacher-001",
            name: "Bluegate Teacher",
            email,
            role: "teacher",
          };
        }

        return null;
      },
    }),
  ],

  pages: {
    signIn: "/teacher-login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;