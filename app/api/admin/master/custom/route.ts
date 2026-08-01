import { NextResponse } from "next/server";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { createDefinition, listDefinitions } from "@/lib/master-data";
import { masterDataErrorResponse } from "@/lib/master-data-response";

export async function GET() {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  return NextResponse.json(await listDefinitions(access.actor.publisherId));
}

export async function POST(request: Request) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  try { return NextResponse.json(await createDefinition(access.actor, await request.json()), { status: 201 }); }
  catch (error) { return masterDataErrorResponse(error, "Unable to create master data type."); }
}
