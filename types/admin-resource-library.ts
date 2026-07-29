import type { ResourceAudience, ResourceType } from "@prisma/client";

export type AdminResourceLibraryItem = {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  audience: ResourceAudience;
  fileUrl: string;
  originalFileName: string | null;
  mimeType: string | null;
  fileSizeBytes: string | null;
  thumbnail: string | null;
  published: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  className: string | null;
  subjectName: string | null;
  seriesName: string | null;
  book: { id: string; title: string } | null;
  contextualUsageCount: number;
  schoolUsageCount: number;
  legacyAttached: boolean;
};

export type AdminResourcePagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
