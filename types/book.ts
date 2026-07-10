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

  cover: string;

  pdf: string;

  description: string;

  featured: boolean;
  edition?: string;
  publisher?: string;
  price?: string;
}
