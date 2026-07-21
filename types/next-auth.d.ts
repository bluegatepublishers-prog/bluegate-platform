import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      userId?: string;
      role?: string;
      studentId?: string;
      publisherId?: string;
      schoolId?: string;
      academicYearId?: string;
      academicYear?: string;
      mustChangePassword?: boolean;
    };
  }

  interface User {
    role?: string;
    studentId?: string;
    publisherId?: string;
    schoolId?: string;
    academicYearId?: string;
    academicYear?: string;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    studentId?: string;
    publisherId?: string;
    schoolId?: string;
    academicYearId?: string;
    academicYear?: string;
    mustChangePassword?: boolean;
  }
}
