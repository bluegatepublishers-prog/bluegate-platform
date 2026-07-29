import { requireQrAdmin } from "@/lib/qr/qr-authorization";
import {
  listQrRevisions,
  qrErrorResponse,
} from "@/lib/qr/qr-service";

export const dynamic = "force-dynamic";

type QrRevisionRouteContext = {
  params: Promise<{ id: string }>;
};

function positiveInteger(value: string | null, fallback: number) {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  request: Request,
  context: QrRevisionRouteContext,
) {
  try {
    const actor = await requireQrAdmin();
    const { id } = await context.params;
    const url = new URL(request.url);
    const page = positiveInteger(url.searchParams.get("page"), 1);
    const pageSize = positiveInteger(url.searchParams.get("pageSize"), 20);

    if (page === null || pageSize === null || pageSize > 100) {
      return Response.json(
        {
          error:
            "page and pageSize must be positive integers; pageSize may not exceed 100.",
        },
        { status: 400 },
      );
    }

    return Response.json(
      await listQrRevisions(actor, id, { page, pageSize }),
    );
  } catch (error) {
    return qrErrorResponse(error);
  }
}
