export type UploadScope = "book-cover" | "book-gallery" | "book-sample" | "book-public-preview" | "book-full" | "school-logo" | "publisher-logo" | "publisher-favicon" | "resource-file" | "resource-thumbnail";
export type UploadValidation = { ok: true; extension: string; contentType: string; maxSize: number; objectPrefix: string } | { ok: false; code: "INVALID_SCOPE" | "INVALID_FILE_TYPE" | "FILE_TOO_LARGE" | "EMPTY_FILE"; message: string };
export interface StorageProvider { delete(url: string): Promise<void>; isManagedUrl(url: string): boolean }
