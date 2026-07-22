import { NextResponse } from "next/server";
import { authorizePublisherAdminApi } from "@/lib/publisher-admin-authorization";
import { repairPublisherStorageFile } from "@/lib/storage/storage-lifecycle-runtime";

export async function POST(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { actor, response } = await authorizePublisherAdminApi();
  if (response || !actor) return response!;
  const result = await repairPublisherStorageFile(actor, (await params).fileId).catch(() => null);
  if (!result) return NextResponse.json({ message: "File not found or repair failed." }, { status: 404 });
  if (request.headers.get("accept")?.includes("application/json")) return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(new URL("/admin/storage/repairs", request.url), 303);
}
