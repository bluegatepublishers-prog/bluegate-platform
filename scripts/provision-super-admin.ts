import { Prisma, PrismaClient, UserRole } from "@prisma/client";

import { hashPassword, verifyPassword } from "../lib/password";
import {
  decideSuperAdminProvisioning,
  parseSuperAdminProvisioningEnvironment,
  SuperAdminProvisioningConflictError,
  SuperAdminProvisioningInputError,
} from "../lib/super-admin-provisioning-policy";

const prisma = new PrismaClient();

async function provisionSuperAdmin() {
  const input = parseSuperAdminProvisioningEnvironment(process.env);

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`provision-super-admin:${input.email}`}))`;

      const existing = await tx.user.findUnique({
        where: { email: input.email },
        select: {
          id: true,
          name: true,
          password: true,
          role: true,
          publisherId: true,
          school: { select: { id: true } },
          teacher: { select: { id: true } },
          student: { select: { id: true } },
          mentor: { select: { id: true } },
          parent: { select: { id: true } },
        },
      });

      const decision = decideSuperAdminProvisioning(existing);

      if (decision === "CREATE") {
        await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            password: await hashPassword(input.password),
            role: UserRole.SUPER_ADMIN,
            publisherId: null,
          },
        });
        return;
      }

      if (!existing) throw new Error("Provisioning decision was inconsistent.");
      const passwordMatches = await verifyPassword(
        input.password,
        existing.password,
      );
      await tx.user.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          password: passwordMatches
            ? existing.password
            : await hashPassword(input.password),
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  console.log("Super Admin account is ready.");
}

provisionSuperAdmin()
  .catch((error: unknown) => {
    if (
      error instanceof SuperAdminProvisioningInputError ||
      error instanceof SuperAdminProvisioningConflictError
    ) {
      console.error(error.message);
    } else {
      console.error("Super Admin provisioning failed.");
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
