import "server-only";
import { deleteFile, isManagedFileUrl } from "@/lib/storage";
export async function removeManagedResourceFile(url:string|null|undefined){if(!isManagedFileUrl(url)||!isResourceUrl(url))return;try{await deleteFile(url)}catch{console.warn("Managed resource file cleanup failed",{code:"DELETE_FAILED"})}}
function isResourceUrl(url:string){if(url.startsWith("/uploads/resources/"))return true;try{return new URL(url).pathname.startsWith("/resources/")}catch{return false}}
