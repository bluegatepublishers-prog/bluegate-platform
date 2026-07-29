import {
  generateQrImage,
  permanentQrUrl,
  safeQrFilename,
  type QrErrorCorrection,
  type QrImageFormat,
} from "@/lib/qr/qr-image";
import { requireQrAdmin } from "@/lib/qr/qr-authorization";
import {
  getQrCode,
  qrErrorResponse,
} from "@/lib/qr/qr-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QrImageRouteContext = {
  params: Promise<{ id: string }>;
};

const FORMATS = new Set<QrImageFormat>(["png", "svg"]);
const ERROR_CORRECTION_LEVELS = new Set<QrErrorCorrection>([
  "L",
  "M",
  "Q",
  "H",
]);
const MIN_SIZE = 256;
const MAX_SIZE = 4096;
const MIN_MARGIN = 1;
const MAX_MARGIN = 16;

function integerParameter(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

export async function GET(
  request: Request,
  context: QrImageRouteContext,
) {
  try {
    const url = new URL(request.url);
    const formatValue = (url.searchParams.get("format") ?? "png").toLowerCase();
    const errorCorrectionValue = (
      url.searchParams.get("errorCorrection") ?? "H"
    ).toUpperCase();
    const size = integerParameter(
      url.searchParams.get("size"),
      1200,
      MIN_SIZE,
      MAX_SIZE,
    );
    const margin = integerParameter(
      url.searchParams.get("margin"),
      4,
      MIN_MARGIN,
      MAX_MARGIN,
    );

    if (
      !FORMATS.has(formatValue as QrImageFormat) ||
      !ERROR_CORRECTION_LEVELS.has(
        errorCorrectionValue as QrErrorCorrection,
      ) ||
      size === null ||
      margin === null
    ) {
      return Response.json(
        {
          error:
            "Invalid image options. Use format png or svg, size 256–4096, margin 1–16, and errorCorrection L, M, Q or H.",
        },
        { status: 400 },
      );
    }

    const actor = await requireQrAdmin();
    const { id } = await context.params;
    const qrCode = await getQrCode(actor, id);
    const format = formatValue as QrImageFormat;
    const image = await generateQrImage(permanentQrUrl(qrCode.publicCode), {
      format,
      size,
      margin,
      errorCorrection: errorCorrectionValue as QrErrorCorrection,
    });
    const filename = safeQrFilename(qrCode.name, qrCode.publicCode, format);

    return new Response(
      typeof image === "string" ? image : new Uint8Array(image),
      {
        headers: {
          "Content-Type": format === "png" ? "image/png" : "image/svg+xml",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    return qrErrorResponse(error);
  }
}
