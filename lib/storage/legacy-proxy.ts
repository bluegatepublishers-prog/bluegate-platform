import "server-only";

import { NextResponse } from "next/server";
import { proxyRemoteStorage } from "./storage-delivery";

export async function proxyLegacyBlob(input: { request?: Request; url: string; filename: string; disposition?: "attachment" | "inline"; expectedContentType?: string; cacheControl?: string }) {
  let parsed: URL;
  try { parsed = new URL(input.url); } catch { return NextResponse.json({ message: "File unavailable." }, { status: 409 }); }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".public.blob.vercel-storage.com")) return NextResponse.json({ message: "File unavailable." }, { status: 409 });
  return proxyRemoteStorage({ request: input.request ?? new Request("http://localhost"), url: parsed.href, filename: input.filename, disposition: input.disposition ?? "attachment", expectedContentType: input.expectedContentType, cacheControl: input.cacheControl ?? "private, no-store" });
}
