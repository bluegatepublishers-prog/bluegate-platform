import type { UploadScope, UploadValidation } from "./types";

const MB=1024*1024;
export const uploadRules:Record<UploadScope,{extensions:string[];contentTypes:string[];maxSize:number;prefix:string}>={
  "book-cover":{extensions:[".jpg",".jpeg",".png",".webp"],contentTypes:["image/jpeg","image/png","image/webp"],maxSize:5*MB,prefix:"books/covers"},
  "book-gallery":{extensions:[".jpg",".jpeg",".png",".webp"],contentTypes:["image/jpeg","image/png","image/webp"],maxSize:5*MB,prefix:"books/gallery"},
  "book-sample":{extensions:[".pdf"],contentTypes:["application/pdf"],maxSize:50*MB,prefix:"books/samples"},
  "resource-thumbnail":{extensions:[".jpg",".jpeg",".png",".webp"],contentTypes:["image/jpeg","image/png","image/webp"],maxSize:5*MB,prefix:"resources/thumbnails"},
  "resource-file":{extensions:[".pdf",".ppt",".pptx",".doc",".docx",".zip",".mp4",".webm",".mov"],contentTypes:["application/pdf","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/zip","application/x-zip-compressed","video/mp4","video/webm","video/quicktime"],maxSize:100*MB,prefix:"resources/files"},
};
export function isUploadScope(value:unknown):value is UploadScope{return typeof value==="string"&&value in uploadRules}
export function extensionOf(name:string){const index=name.lastIndexOf(".");return index>=0?name.slice(index).toLowerCase():""}
export function safeUploadName(name:string){const extension=extensionOf(name),base=name.slice(0,name.length-extension.length).normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"file";return `${base}${extension}`}
export function clientUploadPath(scope:UploadScope,name:string){return `${uploadRules[scope].prefix}/${safeUploadName(name)}`}
export function validateDirectUpload(file:File,scope:unknown):UploadValidation{if(!isUploadScope(scope))return{ok:false,code:"INVALID_SCOPE",message:"The upload type is not supported."};if(!file.size)return{ok:false,code:"EMPTY_FILE",message:"Choose a non-empty file."};const rule=uploadRules[scope],extension=extensionOf(file.name);if(!rule.extensions.includes(extension)||!rule.contentTypes.includes(file.type.toLowerCase()))return{ok:false,code:"INVALID_FILE_TYPE",message:`This file type is not allowed. Accepted: ${rule.extensions.join(", ")}.`};if(file.size>rule.maxSize)return{ok:false,code:"FILE_TOO_LARGE",message:`The file must be smaller than ${Math.round(rule.maxSize/MB)} MB.`};return{ok:true,extension,contentType:file.type,maxSize:rule.maxSize,objectPrefix:rule.prefix}}
