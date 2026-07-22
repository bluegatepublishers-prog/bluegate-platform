/**
 * A collection of trusted helpers for validating file properties.
 * This provides a foundation for enforcing file policies before generating upload URLs.
 */

export const MimeTypes = {
  // Images
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  // Documents
  pdf: "application/pdf",
  // Presentations
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Archives
  zip: "application/zip",
} as const;

const ONE_MB = 1024 * 1024;

export const MaxFileSizes = {
  image: 5 * ONE_MB,
  document: 25 * ONE_MB,
  presentation: 50 * ONE_MB,
  archive: 100 * ONE_MB,
  default: 10 * ONE_MB,
} as const;

export const AllowedMimeTypes = {
  image: [MimeTypes.jpeg, MimeTypes.png, MimeTypes.webp, MimeTypes.gif],
  document: [MimeTypes.pdf],
  presentation: [MimeTypes.ppt, MimeTypes.pptx],
  archive: [MimeTypes.zip],
};

/** Normalizes a MIME type to lowercase and trims whitespace. */
export function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase();
}

/** Checks if a file size is positive and within a given maximum. */
export function isValidFileSize(size: number, maxSize: number): boolean {
  return size > 0 && size <= maxSize;
}