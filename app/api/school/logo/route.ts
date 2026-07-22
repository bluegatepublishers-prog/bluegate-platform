import { NextResponse } from "next/server";
import { requireSchool } from "@/lib/school-dashboard";
import { getStorageProvider } from "@/lib/storage/provider";
import { normalizeAndValidateObjectKey } from "@/lib/storage/object-key";
import { uploadPrefixForScope } from "@/lib/storage/upload-policy";
import { proxyLegacyBlob } from "@/lib/storage/legacy-proxy";
import { classifyStorageValue } from "@/lib/storage/storage-records";
import { proxyRemoteStorage } from "@/lib/storage/storage-delivery";

export async function GET(request: Request) {
  const school = await requireSchool();
  if (!school.logoUrl) return NextResponse.json({ message: "File not found." }, { status: 404 });
  if (classifyStorageValue(school.logoUrl) === "BLOB") return proxyLegacyBlob({ request, url: school.logoUrl, filename: "school-logo", disposition: "inline" });
  let key: string;
  try { key = normalizeAndValidateObjectKey(school.logoUrl); } catch { return NextResponse.json({ message: "File unavailable." }, { status: 409 }); }
  if (!key.startsWith(`${uploadPrefixForScope("school-logo")}/${school.id}/`)) return NextResponse.json({ message: "File unavailable." }, { status: 409 });
  const provider = getStorageProvider();
  const object = await provider.headObject({ key });
  if (!object) return NextResponse.json({ message: "File not found." }, { status: 404 });
  const signed = await provider.createSignedDownloadUrl({ key, expiresInSeconds: 60, disposition: "inline" });
  return proxyRemoteStorage({ request, url: signed.url, filename: "school-logo", disposition: "inline", expectedContentType: object.contentType, cacheControl: "private, max-age=30" });
}
