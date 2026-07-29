import { resolveQrRedirect } from "@/lib/qr/resolve-redirect";

export const dynamic = "force-dynamic";

type QrRedirectContext = {
  params: Promise<{ publicCode: string }>;
};

export async function GET(request: Request, context: QrRedirectContext) {
  try {
    const { publicCode } = await context.params;
    return await resolveQrRedirect(publicCode, request);
  } catch (error) {
    console.error("Dynamic QR redirect failed", error);
    return new Response("The QR service is temporarily unavailable.", {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
}

export const HEAD = GET;
