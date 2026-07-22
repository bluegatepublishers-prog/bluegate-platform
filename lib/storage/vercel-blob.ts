import "server-only";
import { del } from "@vercel/blob";
import type { LegacyUrlStorageProvider } from "./types";

const MANAGED_PREFIXES=["books/covers/","books/gallery/","books/samples/","books/public-previews/","books/full-books/","schools/","resources/"];
export class VercelBlobStorageProvider implements LegacyUrlStorageProvider {
  async delete(url:string){if(!this.isManagedUrl(url))return;await del(url)}
  isManagedUrl(url:string){try{const parsed=new URL(url),pathname=parsed.pathname.slice(1);return parsed.protocol==="https:"&&parsed.hostname.endsWith(".public.blob.vercel-storage.com")&&(MANAGED_PREFIXES.some(prefix=>pathname.startsWith(prefix))||/^publishers\/[^/]+\/(books\/|resources\/|branding\/)/.test(pathname))}catch{return false}}
}
