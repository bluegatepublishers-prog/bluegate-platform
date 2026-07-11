import "server-only";
import { deleteFile, isManagedFileUrl } from "@/lib/storage";
export function isManagedBookFile(value:string|null|undefined):value is string{if(!isManagedFileUrl(value))return false;if(value.startsWith("/uploads/books/"))return true;try{return new URL(value).pathname.startsWith("/books/")}catch{return false}}
export async function removeManagedBookFiles(values:Array<string|null|undefined>){const unique=[...new Set(values.filter(isManagedBookFile))];const results=await Promise.allSettled(unique.map(deleteFile));if(results.some(result=>result.status==="rejected"))console.warn("Managed book file cleanup was incomplete",{count:results.filter(result=>result.status==="rejected").length})}
