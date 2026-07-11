import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { LocalStorageProvider } from "./local";
import { VercelBlobStorageProvider } from "./vercel-blob";
import type { StorageProvider, UploadScope, UploadValidation } from "./types";

const MB=1024*1024;
const rules:Record<UploadScope,{extensions:string[];mimes:string[];maxSize:number;prefix:string}>={
  "book-cover":{extensions:[".jpg",".jpeg",".png",".webp"],mimes:["image/jpeg","image/png","image/webp"],maxSize:5*MB,prefix:"books/covers"},
  "book-gallery":{extensions:[".jpg",".jpeg",".png",".webp"],mimes:["image/jpeg","image/png","image/webp"],maxSize:5*MB,prefix:"books/gallery"},
  "book-sample":{extensions:[".pdf"],mimes:["application/pdf"],maxSize:50*MB,prefix:"books/samples"},
  "resource-thumbnail":{extensions:[".jpg",".jpeg",".png",".webp"],mimes:["image/jpeg","image/png","image/webp"],maxSize:5*MB,prefix:"resources/thumbnails"},
  resource:{extensions:[".pdf",".ppt",".pptx",".doc",".docx",".zip",".mp4",".webm",".mov"],mimes:["application/pdf","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/zip","application/x-zip-compressed","video/mp4","video/webm","video/quicktime"],maxSize:100*MB,prefix:"resources/files"},
};
const local=new LocalStorageProvider(),blob=new VercelBlobStorageProvider();
function provider():StorageProvider{return process.env.NODE_ENV==="development"&&process.env.BLUEGATE_STORAGE_PROVIDER?.trim().toLowerCase()!=="vercel-blob"?local:blob}
export function validateUpload(file:File,scope:unknown):UploadValidation{if(typeof scope!=="string"||!(scope in rules))return{ok:false,code:"INVALID_SCOPE",message:"The upload type is not supported."};if(!file.size)return{ok:false,code:"EMPTY_FILE",message:"Choose a non-empty file."};const rule=rules[scope as UploadScope],extension=path.extname(file.name).toLowerCase();if(!rule.extensions.includes(extension)||!rule.mimes.includes(file.type.toLowerCase()))return{ok:false,code:"INVALID_FILE_TYPE",message:`This file type is not allowed. Accepted: ${rule.extensions.join(", ")}.`};if(file.size>rule.maxSize)return{ok:false,code:"FILE_TOO_LARGE",message:`The file must be smaller than ${Math.round(rule.maxSize/MB)} MB.`};return{ok:true,extension,contentType:file.type,maxSize:rule.maxSize,objectPrefix:rule.prefix}}
export async function uploadFile(file:File,scope:UploadScope){const validation=validateUpload(file,scope);if(!validation.ok)throw new StorageValidationError(validation.code,validation.message);const safeBase=path.basename(file.name,validation.extension).normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"file";const pathname=`${validation.objectPrefix}/${Date.now()}-${randomUUID()}-${safeBase}${validation.extension}`;return provider().upload(file,pathname)}
export async function deleteFile(url:string|null|undefined){if(!url)return;for(const candidate of [blob,local])if(candidate.isManagedUrl(url)){await candidate.delete(url);return}}
export function isManagedFileUrl(url:string|null|undefined):url is string{return Boolean(url&&(blob.isManagedUrl(url)||local.isManagedUrl(url)))}
export class StorageValidationError extends Error{constructor(readonly code:string,message:string){super(message);this.name="StorageValidationError"}}
export type { UploadScope, UploadValidation } from "./types";
