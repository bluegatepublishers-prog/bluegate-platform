import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loadStudentIdentity } from "@/lib/student-identity";
import { studentSessionClaims } from "@/lib/student-identity-service";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { isCredentialRolePublisherInvariantValid } from "@/lib/role-publisher-policy";
import { PlatformFeatureKey } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,

  session: {
    strategy: "jwt",
  },

  providers: [
    Credentials({
      id: "credentials",
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
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = credentials?.password as string;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email }, include: { school: { select: { status: true, publisherId: true, publisher: { select: { active: true } } } }, teacher: { select: { active: true, status: true, school: { select: { status: true, publisherId: true, publisher: { select: { active: true } } } } } }, student: { select: { school: { select: { publisherId: true } } } }, mentor: { select: { active: true, publisherId: true, publisher: { select: { active: true } } } }, parent: { select: { active: true } }, publisher: { select: { id: true, active: true } } } });

        if (!user) {
          return null;
        }

        if (user.role === "STUDENT" || !user.active) {
          return null;
        }

        const validPassword = await verifyPassword(
          password,
          user.password
        );

        if (!validPassword) {
          return null;
        }

        const tenantOwnerPublisherId =
  user.role === "ADMIN"
    ? user.publisherId
    : user.role === "SCHOOL"
      ? user.school?.publisherId ?? null
      : user.role === "TEACHER"
        ? user.teacher?.school?.publisherId ?? null
        : user.role === "MENTOR"
          ? user.mentor?.publisherId ?? null
          : null;

        if (!isCredentialRolePublisherInvariantValid({
          role: user.role,
          publisherId: user.publisherId,
          publisher: user.publisher,
          tenantOwnerPublisherId,
        })) {
          return null;
        }

        if (
  ["SCHOOL", "TEACHER"].includes(user.role) &&
  !user.emailVerifiedAt
) {
  return null;
}

        if (user.role === "SCHOOL" && (user.school?.status !== "APPROVED" || !user.school.publisher?.active)) return null;
        if (user.role === "TEACHER" && (!user.teacher?.active || user.teacher.status !== "APPROVED" || user.teacher.school?.status !== "APPROVED" || !user.teacher.school.publisher?.active)) return null;
        if (user.role === "ADMIN" && !user.publisher?.active) return null;
        if (user.role === "MENTOR" && (!user.mentor?.active || !user.mentor.publisher.active || user.publisherId !== user.mentor.publisherId || !(await isPublisherFeatureEnabled(user.mentor.publisherId, PlatformFeatureKey.TUTOR_PLATFORM)))) return null;
        if (user.role === "PARENT" && !user.parent?.active) return null;

        
        return {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  mustChangePassword: user.mustChangePassword,
};
      },
    }),
    Credentials({
      id: "student-credentials",
      name: "Student Login",
      credentials: {
        loginId: {
          label: "Student Login ID",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const loginId = String(credentials?.loginId ?? "").trim().toLowerCase();
        const password = credentials?.password as string;

        if (!loginId || !password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            role: "STUDENT",
            active: true,
            OR: [{ username: loginId }, { email: loginId }],
          },
          include: {
            student: {
              select: {
                active: true,
                school: {
                  select: {
                    status: true,
                    publisherId: true,
                    publisher: { select: { active: true } },
                  },
                },
              },
            },
            publisher: { select: { id: true, active: true } },
          },
        });

        if (!user) {
          return null;
        }

        const validPassword = await verifyPassword(password, user.password);
        if (!validPassword) {
          return null;
        }

        if (!user.student?.active) {
          return null;
        }

        if (
          user.student.school.status !== "APPROVED" ||
          !user.student.school.publisherId ||
          !user.student.school.publisher?.active
        ) {
          return null;
        }

        const claims = studentSessionClaims(
          await loadStudentIdentity(user.id, user.role, user.publisherId),
        );

        if (!claims) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          ...claims,
        };
      },
    }),
  ],

  pages: {
    signIn: "/teacher-login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.studentId = user.studentId;
        token.publisherId = user.publisherId;
        token.schoolId = user.schoolId;
        token.academicYearId = user.academicYearId;
        token.academicYear = user.academicYear;
        token.mustChangePassword = user.mustChangePassword;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
          session.user.userId = token.sub;
        }
        session.user.role = token.role;
        session.user.studentId = token.studentId;
        session.user.publisherId = token.publisherId;
        session.user.schoolId = token.schoolId;
        session.user.academicYearId = token.academicYearId;
        session.user.academicYear = token.academicYear;
        session.user.mustChangePassword = token.mustChangePassword;
      }

      return session;
    },
  },
});
