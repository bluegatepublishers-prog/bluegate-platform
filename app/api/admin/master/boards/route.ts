import { NextResponse } from "next/server";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { createBoard } from "@/lib/master-data";
import { masterDataErrorResponse } from "@/lib/master-data-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const includeId = new URL(request.url).searchParams.get("include");
  const rows = await prisma.board.findMany({
    where: { publisherId: access.actor.publisherId, OR: [{ active: true }, ...(includeId ? [{ id: includeId }] : [])] },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  try {
    return NextResponse.json(await createBoard(access.actor, await request.json()), { status: 201 });
  } catch (error) { return masterDataErrorResponse(error, "Unable to create board."); }
}
