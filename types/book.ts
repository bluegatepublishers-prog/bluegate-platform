export interface Book {
  id: string;

  slug: string;

  title: string;
  author?: string;

  subtitle: string;

  class: string;

  board: string;

  subject: string;

  series: string;

  isbn: string;

  pages: number;

  weight?: string;

  cover: string;

  publicPreviewPdf: string;

  description: string;

  features: string[];

  learningOutcomes: string[];

  tableOfContents: string[];

  featured: boolean;
  edition?: string;
  publisher?: string;
  publisherId?: string;
  price?: string;
}
