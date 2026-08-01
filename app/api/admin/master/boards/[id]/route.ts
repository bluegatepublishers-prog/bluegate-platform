import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizePublisherAdminApi, publisherAdminNotFound } from "@/lib/publisher-admin-authorization";
import { updateBoard } from "@/lib/master-data";
import { masterDataErrorResponse } from "@/lib/master-data-response";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: RouteContext<"/api/admin/master/boards/[id]">) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await context.params;
  const row = await prisma.board.findFirst({ where: { id, publisherId: access.actor.publisherId } });
  return row ? NextResponse.json(row) : publisherAdminNotFound();
}

export async function PUT(request: Request, context: RouteContext<"/api/admin/master/boards/[id]">) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await context.params;
  try {
    const row = await updateBoard(access.actor, id, await request.json());
    revalidatePath("/admin/master"); revalidatePath("/admin/master/boards");
    return NextResponse.json(row);
  } catch (error) { return masterDataErrorResponse(error, "Unable to update board."); }
}
