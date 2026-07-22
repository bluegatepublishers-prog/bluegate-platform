import { NextResponse } from "next/server";
import { requireSchool } from "@/lib/school-dashboard";
import { getStorageProvider } from "@/lib/storage/provider";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";
import { classifyStorageValue } from "@/lib/storage/storage-records";

export async function GET() {
  const school = await requireSchool();
  if (!school.logoUrl) return NextResponse.json({ message: "File not found." }, { status: 404 });
  if (classifyStorageValue(school.logoUrl) === "BLOB") return proxyLegacyBlob({ url: school.logoUrl, filename: "school-logo", disposition: "inline" });
  let key: string;
  try { key = normalizeAndValidateObjectKey(school.logoUrl); } catch { return NextResponse.json({ message: "File unavailable." }, { status: 409 }); }
  if (!key.startsWith(`${uploadPrefixForScope("school-logo")}/${school.id}/`)) return NextResponse.json({ message: "File unavailable." }, { status: 409 });
  const provider = getStorageProvider();
  if (!(await provider.headObject({ key }))) return NextResponse.json({ message: "File not found." }, { status: 404 });
  const signed = await provider.createSignedDownloadUrl({ key, expiresInSeconds: 60, disposition: "inline" });
  return NextResponse.redirect(signed.url, { status: 307, headers: { "Cache-Control": "private, max-age=30", "Referrer-Policy": "no-referrer" } });
}
