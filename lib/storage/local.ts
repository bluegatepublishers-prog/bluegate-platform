import "server-only";
import { unlink } from "node:fs/promises";
import path from "node:path";
import type { LegacyUrlStorageProvider } from "./types";

const PREFIX = "/uploads/";
export class LocalStorageProvider implements LegacyUrlStorageProvider {
  async delete(url:string){if(!this.isManagedUrl(url))return;const publicRoot=path.resolve(process.cwd(),"public"),target=path.resolve(publicRoot,url.slice(1));if(!target.startsWith(`${path.resolve(publicRoot,"uploads")}${path.sep}`))return;try{await unlink(target)}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error}}
  isManagedUrl(url:string){return url.startsWith(PREFIX)&&!url.includes("..")}
}
