export type UploadScope = "book-cover" | "book-gallery" | "book-sample" | "resource-file" | "resource-thumbnail";
export type UploadValidation = { ok: true; extension: string; contentType: string; maxSize: number; objectPrefix: string } | { ok: false; code: "INVALID_SCOPE" | "INVALID_FILE_TYPE" | "FILE_TOO_LARGE" | "EMPTY_FILE"; message: string };
export type StoredFile = { url: string; pathname: string };
export interface StorageProvider { upload(file: File, pathname: string): Promise<StoredFile>; delete(url: string): Promise<void>; isManagedUrl(url: string): boolean }
