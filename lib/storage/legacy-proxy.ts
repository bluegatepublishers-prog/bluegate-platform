import "server-only";

import { NextResponse } from "next/server";
import { createContentDisposition } from "./disposition";

export async function proxyLegacyBlob(input: { url: string; filename: string; disposition?: "attachment" | "inline" }) {
  let parsed: URL;
  try { parsed = new URL(input.url); } catch { return NextResponse.json({ message: "File unavailable." }, { status: 409 }); }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".public.blob.vercel-storage.com")) return NextResponse.json({ message: "File unavailable." }, { status: 409 });
  const source = await fetch(parsed, { redirect: "error" }).catch(() => null);
  if (!source?.ok || !source.body) return NextResponse.json({ message: "File not found." }, { status: 404 });
  return new NextResponse(source.body, { status: 200, headers: { "Cache-Control": "private, no-store", "Content-Disposition": createContentDisposition(input.filename, input.disposition), "Content-Type": source.headers.get("content-type") || "application/octet-stream", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}
