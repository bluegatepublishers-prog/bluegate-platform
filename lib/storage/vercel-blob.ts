import "server-only";
import { del, put } from "@vercel/blob";
import type { StorageProvider, StoredFile } from "./types";

const MANAGED_PREFIXES=["books/covers/","books/gallery/","books/samples/","resources/"];
export class VercelBlobStorageProvider implements StorageProvider {
  async upload(file:File,pathname:string):Promise<StoredFile>{const token=process.env.BLOB_READ_WRITE_TOKEN?.trim();if(!token)throw new Error("Blob storage is not configured.");const blob=await put(pathname,file,{access:"public",addRandomSuffix:false,token,contentType:file.type});return{url:blob.url,pathname:blob.pathname}}
  async delete(url:string){if(!this.isManagedUrl(url))return;const token=process.env.BLOB_READ_WRITE_TOKEN?.trim();if(!token)throw new Error("Blob storage is not configured.");await del(url,{token})}
  isManagedUrl(url:string){try{const parsed=new URL(url);return parsed.protocol==="https:"&&parsed.hostname.endsWith(".public.blob.vercel-storage.com")&&MANAGED_PREFIXES.some(prefix=>parsed.pathname.slice(1).startsWith(prefix))}catch{return false}}
}
