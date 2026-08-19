import { NextResponse } from "next/server";

import { prepareProtectedResourceDownload } from "@/lib/storage/protected-download";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";

const safeHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const forwardedMediaHeaders = [
  "accept-ranges",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
] as const;

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await params;

  const result =
    await prepareProtectedResourceDownload({
      resourceId: id,

      /*
       * Smart Book embedded media can be consumed
       * by entitled Teachers and Students.
       *
       * The entitlement layer still enforces:
       * - account/role eligibility
       * - publisher
       * - school
       * - assignment/enrollment
       * - resource audience
       * - resource/book entitlement
       */
      allowedRoles: [
        "TEACHER",
        "STUDENT",
        "ADMIN",
        "MENTOR",
      ],

      disposition: "inline",
    });

  if (!result.ok) {
    return NextResponse.json(
      {
        code: result.code,
        message: result.message,
      },
      {
        status: result.status,
        headers: safeHeaders,
      },
    );
  }

  /*
   * Preserve the existing legacy-storage path.
   */
  if (result.legacy) {
    return proxyLegacyBlob({
      url: result.url,
      filename: "resource",
      disposition: "inline",
    });
  }

  /*
   * HTML5 audio/video players commonly request
   * byte ranges.
   *
   * Redirecting to a temporary storage URL can
   * make browser media loading/seeking unreliable.
   *
   * Instead, proxy the signed object response and
   * forward the client's Range request.
   */
  const range =
    request.headers.get("range");

  let source: Response;

  try {
    source = await fetch(
      result.url,
      {
        method: "GET",

        headers: range
          ? {
              Range: range,
            }
          : undefined,

        redirect: "follow",

        /*
         * Never reuse protected media responses
         * through the Next.js fetch cache.
         */
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "The media resource is temporarily unavailable.",
      },
      {
        status: 502,
        headers: safeHeaders,
      },
    );
  }

  if (
    !source.ok ||
    !source.body
  ) {
    return NextResponse.json(
      {
        message:
          "The media resource could not be loaded.",
      },
      {
        status:
          source.status >= 400 &&
          source.status < 600
            ? source.status
            : 502,

        headers: safeHeaders,
      },
    );
  }

  const headers =
    new Headers(
      safeHeaders,
    );

  for (
    const name of forwardedMediaHeaders
  ) {
    const value =
      source.headers.get(name);

    if (value) {
      headers.set(
        name,
        value,
      );
    }
  }

  /*
   * R2/object storage should normally provide
   * the MIME type. Keep a safe fallback for
   * older uploaded objects.
   */
  if (
    !headers.has(
      "Content-Type",
    )
  ) {
    headers.set(
      "Content-Type",
      "application/octet-stream",
    );
  }

  /*
   * Do not force Content-Disposition here.
   * The resource is being consumed inline by
   * <video>/<audio>, not downloaded.
   */
  return new Response(
    source.body,
    {
      status:
        source.status,

      headers,
    },
  );
}