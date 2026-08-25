import type { BookFormData } from "@/types/book-form";

export function createEmptyBookFormData(): BookFormData {
  return {
    title: "",
    author: "",
    subtitle: "",
    isbn: "",
    description: "",
    aboutBook: "",
    seoTitle: "",
    seoDescription: "",
    keywords: [],
    pages: "",
    edition: "",
    language: "",
    board: "",
    boardId: "",
    price: "",
    binding: "",
    publisher: "",
    publicationYear: "",
    weight: "",
    dimensions: "",
    coverImage: "",
    samplePdf: "",
    publicPreviewPdf: "",
    fullBookPdf: "",
    galleryImages: [],
    features: [],
    learningOutcomes: [],
    tableOfContents: [],
    classId: "",
    subjectId: "",
    seriesId: "",
    featured: false,
    featuredOrder: 0,
    published: true,
    publicCatalogueVisible: false,
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalNumber(value: unknown): number | "" {
  if (value === "" || value === null || value === undefined) return "";

  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function featuredOrderNumber(value: unknown): number {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  const integer = Math.trunc(parsed);
  return integer >= 0 ? integer : 0;
}

export function parseBookFormData(value: unknown): BookFormData {
  const input =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    title: text(input.title),
    author: text(input.author),
    subtitle: text(input.subtitle),
    isbn: text(input.isbn),
    description: text(input.description),
    aboutBook: text(input.aboutBook),
    seoTitle: text(input.seoTitle),
    seoDescription: text(input.seoDescription),
    keywords: textList(input.keywords),
    pages: optionalNumber(input.pages),
    edition: text(input.edition),
    language: text(input.language),
    board: text(input.board),
    boardId: text(input.boardId),
    price: optionalNumber(input.price),
    binding: text(input.binding),
    publisher: text(input.publisher),
    publicationYear: text(input.publicationYear),
    weight: text(input.weight),
    dimensions: text(input.dimensions),
    coverImage: text(input.coverImage),
    samplePdf: text(input.samplePdf),
    publicPreviewPdf: text(input.publicPreviewPdf) || text(input.samplePdf),
    fullBookPdf: text(input.fullBookPdf),
    galleryImages: textList(input.galleryImages),
    features: textList(input.features),
    learningOutcomes: textList(input.learningOutcomes),
    tableOfContents: textList(input.tableOfContents),
    classId: text(input.classId),
    subjectId: text(input.subjectId),
    seriesId: text(input.seriesId),
    featured:
      typeof input.featured === "boolean" ? input.featured : false,
    featuredOrder: featuredOrderNumber(input.featuredOrder),
    published:
      typeof input.published === "boolean" ? input.published : true,
    publicCatalogueVisible:
      typeof input.publicCatalogueVisible === "boolean"
        ? input.publicCatalogueVisible
        : false,
  };
}

export function toBookPersistenceData(data: BookFormData) {
  return {
    title: data.title,
    author: data.author || null,
    subtitle: data.subtitle || null,
    isbn: data.isbn || null,
    description: data.description || null,
    aboutBook: data.aboutBook || null,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    keywords: data.keywords,
    pages: data.pages === "" ? null : data.pages,
    edition: data.edition || null,
    language: data.language || null,
    board: data.board || null,
    boardId: data.boardId || null,
    price: data.price === "" ? null : data.price,
    binding: data.binding || null,
    publisher: data.publisher || null,
    publicationYear: data.publicationYear || null,
    weight: data.weight || null,
    dimensions: data.dimensions || null,
    coverImage: data.coverImage || null,
    samplePdf: data.samplePdf || null,
    publicPreviewPdf: data.publicPreviewPdf || null,
    fullBookPdf: data.fullBookPdf || null,
    galleryImages: data.galleryImages,
    features: data.features,
    learningOutcomes: data.learningOutcomes,
    tableOfContents: data.tableOfContents,
    classId: data.classId,
    subjectId: data.subjectId,
    seriesId: data.seriesId || null,
    featured: data.featured,
    featuredOrder: data.featuredOrder === "" ? 0 : data.featuredOrder,
    published: data.published,
    publicCatalogueVisible: data.publicCatalogueVisible,
  };
}

export function toVisibleBookFormPayload(data: BookFormData) {
  const {
    subtitle: _subtitle,
    description: _description,
    galleryImages: _galleryImages,
    edition: _edition,
    publisher: _publisher,
    language: _language,
    board: _board,
    binding: _binding,
    dimensions: _dimensions,
    ...visible
  } = data;
  void _subtitle;
  void _description;
  void _galleryImages;
  void _edition;
  void _publisher;
  void _language;
  void _board;
  void _binding;
  void _dimensions;
  return visible;
}
