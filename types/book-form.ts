export interface BookFormData {
  // ===========================
  // Basic Information
  // ===========================

  title: string;
  author: string;
  subtitle: string;
  isbn: string;
  description: string;
  aboutBook: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];

  // ===========================
  // Book Details
  // ===========================

  pages: number | "";
  edition: string;
  language: string;
  board: string;
  boardId: string;
  price: number | "";

  binding: string;
  publisher: string;
  publicationYear: string;
  weight: string;
  dimensions: string;

  // ===========================
  // Media
  // ===========================

  coverImage: string;
  samplePdf: string;
  publicPreviewPdf: string;
  fullBookPdf: string;
  galleryImages: string[];

  // ===========================
  // Dynamic Sections
  // ===========================

  features: string[];
  learningOutcomes: string[];
  tableOfContents: string[];

  // ===========================
  // Academic
  // ===========================

  classId: string;
  subjectId: string;
  seriesId: string;

  // ===========================
  // Status
  // ===========================

  featured: boolean;
  featuredOrder: number | "";
  published: boolean;
  publicCatalogueVisible: boolean;
}

export type BookFormField = keyof BookFormData;

export interface BookFormRecord extends BookFormData {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}
