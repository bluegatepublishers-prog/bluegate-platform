import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider, StoredFile } from "./types";

const PREFIX = "/uploads/";
export class LocalStorageProvider implements StorageProvider {
  async upload(file: File, pathname: string): Promise<StoredFile> { const publicRoot=path.resolve(process.cwd(),"public"),target=path.resolve(publicRoot,"uploads",pathname); if(!target.startsWith(`${path.resolve(publicRoot,"uploads")}${path.sep}`))throw new Error("Invalid local storage path."); await mkdir(path.dirname(target),{recursive:true}); await writeFile(target,Buffer.from(await file.arrayBuffer())); return{url:`${PREFIX}${pathname.replaceAll("\\","/")}`,pathname}; }
  async delete(url:string){if(!this.isManagedUrl(url))return;const publicRoot=path.resolve(process.cwd(),"public"),target=path.resolve(publicRoot,url.slice(1));if(!target.startsWith(`${path.resolve(publicRoot,"uploads")}${path.sep}`))return;try{await unlink(target)}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error}}
  isManagedUrl(url:string){return url.startsWith(PREFIX)&&!url.includes("..")}
}
