import { NextResponse } from "next/server";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { createValue, getDefinition, listValues, MasterDataError } from "@/lib/master-data";
import { masterDataErrorResponse } from "@/lib/master-data-response";

export async function GET(_request: Request, context: RouteContext<"/api/admin/master/custom/[definitionId]/values">) {
  const access = await authorizePublisherAdminApi(); if (access.response) return access.response;
  const { definitionId } = await context.params;
  if (!await getDefinition(access.actor.publisherId, definitionId)) return masterDataErrorResponse(new MasterDataError("Master data type not found.", 404), "Unable to load values.");
  return NextResponse.json(await listValues(access.actor.publisherId, definitionId));
}

export async function POST(request: Request, context: RouteContext<"/api/admin/master/custom/[definitionId]/values">) {
  const access = await authorizePublisherAdminApi(); if (access.response) return access.response;
  const { definitionId } = await context.params;
  try { return NextResponse.json(await createValue(access.actor, definitionId, await request.json()), { status: 201 }); }
  catch (error) { return masterDataErrorResponse(error, "Unable to create master data value."); }
}
