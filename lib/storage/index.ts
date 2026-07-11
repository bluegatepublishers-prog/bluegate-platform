import "server-only";
import { LocalStorageProvider } from "./local";
import { VercelBlobStorageProvider } from "./vercel-blob";

const local=new LocalStorageProvider(),blob=new VercelBlobStorageProvider();
export async function deleteFile(url:string|null|undefined){if(!url)return;for(const provider of[blob,local])if(provider.isManagedUrl(url)){await provider.delete(url);return}}
export function isManagedFileUrl(url:string|null|undefined):url is string{return Boolean(url&&(blob.isManagedUrl(url)||local.isManagedUrl(url)))}
