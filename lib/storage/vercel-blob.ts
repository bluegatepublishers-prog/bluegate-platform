import "server-only";
import { del } from "@vercel/blob";
import type { StorageProvider } from "./types";

const MANAGED_PREFIXES=["books/covers/","books/gallery/","books/samples/","books/public-previews/","books/full-books/","resources/"];
export class VercelBlobStorageProvider implements StorageProvider {
  async delete(url:string){if(!this.isManagedUrl(url))return;await del(url)}
  isManagedUrl(url:string){try{const parsed=new URL(url);return parsed.protocol==="https:"&&parsed.hostname.endsWith(".public.blob.vercel-storage.com")&&MANAGED_PREFIXES.some(prefix=>parsed.pathname.slice(1).startsWith(prefix))}catch{return false}}
}
