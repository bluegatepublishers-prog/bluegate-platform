import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loadStudentIdentity } from "@/lib/student-identity";
import { studentSessionClaims } from "@/lib/student-identity-service";
import { isPublisherFeatureEnabled } from "@/lib/publisher-features";
import { isCredentialRolePublisherInvariantValid } from "@/lib/role-publisher-policy";
import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";
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
        const suppliedCredentials = credentials as Record<string, string | undefined> | undefined;
        const identifier = String(suppliedCredentials?.email ?? suppliedCredentials?.identifier ?? "").trim();
        const email = identifier.toLowerCase();
        const password = suppliedCredentials?.password as string;

        if (!identifier || !password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: email, mode: "insensitive" } },
              { phone: identifier },
              { phone: identifier.replace(/[^0-9+]/g, "") },
            ],
          },
          include: {
            school: { select: { status: true, publisherId: true, publisher: { select: { active: true } } } },
            teacher: {
              select: {
                active: true,
                status: true,
                schoolId: true,
                schoolMemberships: {
                  where: { active: true, status: "ACTIVE" },
                  select: { schoolId: true },
                },
                school: { select: { status: true, publisherId: true, publisher: { select: { active: true } } } },
              },
            },
            student: { select: { school: { select: { publisherId: true } } } },
            mentor: { select: { id: true, active: true, publisherId: true, publisher: { select: { active: true } } } },
            parent: { select: { active: true } },
            publisher: { select: { id: true, active: true } },
          },
        });

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

        const tenantOwnerPublisherId = user.role === "ADMIN"
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

        if (["SCHOOL", "TEACHER"].includes(user.role) && !user.emailVerifiedAt) {
          return null;
        }

        if (user.role === "SCHOOL" && (user.school?.status !== "APPROVED" || !user.school.publisher?.active)) return null;
        if (user.role === "TEACHER" && (!user.teacher?.active || user.teacher.status !== "APPROVED" || user.teacher.school?.status !== "APPROVED" || !user.teacher.school.publisher?.active || !user.teacher.schoolId || !user.teacher.schoolMemberships.some((membership) => membership.schoolId === user.teacher!.schoolId))) return null;
        if (user.role === "ADMIN" && !user.publisher?.active) return null;
        if (user.role === "MENTOR") {
          if (!user.mentor?.active || !user.mentor.publisher.active || user.publisherId !== user.mentor.publisherId || !(await isPublisherFeatureEnabled(user.mentor.publisherId, PlatformFeatureKey.TUTOR_PLATFORM))) return null;
          const activeAssignment = await prisma.mentorStudentAssignment.findFirst({
            where: {
              mentorId: user.mentor.id,
              status: "ACTIVE",
              academicYear: { active: true, current: true },
              student: {
                active: true,
                school: {
                  status: "APPROVED",
                  publisher: { active: true },
                  accessSubscription: {
                    is: { plan: "PAID", status: "ACTIVE" },
                  },
                },
              },
            },
            select: {
              id: true,
              student: {
                select: {
                  school: {
                    select: {
                      accessSubscription: {
                        select: { plan: true, status: true, startsAt: true, expiresAt: true },
                      },
                    },
                  },
                },
              },
            },
          });
          if (!activeAssignment?.student.school.accessSubscription || effectiveSchoolAccessStatus(activeAssignment.student.school.accessSubscription) !== "ACTIVE") return null;
        }
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
            OR: [
  {
    username: {
      equals: loginId,
      mode: "insensitive",
    },
  },
  {
    email: {
      equals: loginId,
      mode: "insensitive",
    },
  },
],
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

        if (!user.student.school.publisherId || !user.student.school.publisher?.active) {
          return null;
        }

        const identity = await loadStudentIdentity(user.id, user.role, user.publisherId);
        const claims = studentSessionClaims(identity);

        if (!claims) {
          if (identity.ok) return null;
          if (!["SCHOOL_UNAVAILABLE", "NO_CURRENT_ENROLLMENT", "INVALID_ACADEMIC_SCOPE"].includes(identity.reason)) {
            return null;
          }
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
