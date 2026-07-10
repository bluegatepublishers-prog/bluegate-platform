import type {
  BookFormField,
} from "@/types/book-form";

export interface NamedEntity {
  name: string;
}

export interface SelectOption extends NamedEntity {
  id: string;
}

export type BookFormValue =
  | string
  | number
  | boolean
  | string[];

export type BookFormChangeHandler = (
  field: BookFormField,
  value: BookFormValue
) => void;

export interface BookTableItem {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  isbn: string | null;
  edition: string | null;
  price: string | null;
  subtitle: string | null;
  coverImage: string | null;
  featured: boolean;
  published: boolean;
  class: NamedEntity;
  subject: NamedEntity;
  series: NamedEntity | null;
  createdAt: string;
  updatedAt: string;
}
