import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizePublisherAdminApi, publisherAdminNotFound } from "@/lib/publisher-admin-authorization";
import { getDefinition, updateDefinition } from "@/lib/master-data";
import { masterDataErrorResponse } from "@/lib/master-data-response";

export async function GET(_request: Request, context: RouteContext<"/api/admin/master/custom/[definitionId]">) {
  const access = await authorizePublisherAdminApi(); if (access.response) return access.response;
  const { definitionId } = await context.params;
  const row = await getDefinition(access.actor.publisherId, definitionId);
  return row ? NextResponse.json(row) : publisherAdminNotFound();
}

export async function PUT(request: Request, context: RouteContext<"/api/admin/master/custom/[definitionId]">) {
  const access = await authorizePublisherAdminApi(); if (access.response) return access.response;
  const { definitionId } = await context.params;
  try {
    const row = await updateDefinition(access.actor, definitionId, await request.json());
    revalidatePath("/admin/master"); revalidatePath("/admin/master/custom");
    return NextResponse.json(row);
  } catch (error) { return masterDataErrorResponse(error, "Unable to update master data type."); }
}
