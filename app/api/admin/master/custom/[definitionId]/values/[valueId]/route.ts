import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizePublisherAdminApi, publisherAdminNotFound } from "@/lib/publisher-admin-authorization";
import { updateValue } from "@/lib/master-data";
import { masterDataErrorResponse } from "@/lib/master-data-response";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: RouteContext<"/api/admin/master/custom/[definitionId]/values/[valueId]">) {
  const access = await authorizePublisherAdminApi(); if (access.response) return access.response;
  const { definitionId, valueId } = await context.params;
  const row = await prisma.masterDataValue.findFirst({ where: { id: valueId, definitionId, publisherId: access.actor.publisherId } });
  return row ? NextResponse.json(row) : publisherAdminNotFound();
}

export async function PUT(request: Request, context: RouteContext<"/api/admin/master/custom/[definitionId]/values/[valueId]">) {
  const access = await authorizePublisherAdminApi(); if (access.response) return access.response;
  const { definitionId, valueId } = await context.params;
  try {
    const row = await updateValue(access.actor, definitionId, valueId, await request.json());
    revalidatePath(`/admin/master/custom/${definitionId}`);
    return NextResponse.json(row);
  } catch (error) { return masterDataErrorResponse(error, "Unable to update master data value."); }
}
