import { prisma } from "@/lib/prisma";
import { evaluateReadiness } from "@/lib/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await evaluateReadiness({
    databaseConfigured: Boolean(process.env.DATABASE_URL?.trim()),
    authenticationConfigured: Boolean((process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)?.trim()),
    checkDatabase: () => prisma.$queryRaw`SELECT 1`,
  });
  return Response.json(result, { status: result.ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
