import type { ContentDocument } from "@/lib/content-document";
import type { LayoutV2Page } from "@/lib/content-layout-v2";

export type BookPageScope = {
  title: string;
  startPage: number;
  endPage: number;
};

export type BookPageView = {
  page: LayoutV2Page;
  absolutePageNumber: number;
  absolutePageCount: number;
  rangePageNumber: number;
  rangePageCount: number;
};

function validRange(startPage: number, endPage: number, total: number) {
  return startPage >= 1 && endPage >= startPage && endPage <= total;
}

function getAbsolutePageNumber(page: LayoutV2Page, index: number) {
  const pageNumber = page.pdfBackground?.pageNumber;
  return typeof pageNumber === "number" && Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : index + 1;
}

export function getBookPageViewsForRange(document: ContentDocument, startPage: number | null, endPage: number | null): BookPageView[] {
  const pages = document.pageLayout?.pages ?? [];
  if (startPage === null && endPage === null) return [];
  if (startPage === null || endPage === null) return [];
  if (!validRange(startPage, endPage, pages.length)) return [];
  const rangePageCount = endPage - startPage + 1;
  return pages
    .map((page, index) => ({ page, absolutePageNumber: getAbsolutePageNumber(page, index) }))
    .filter(({ absolutePageNumber }) => absolutePageNumber >= startPage && absolutePageNumber <= endPage)
    .sort((left, right) => left.absolutePageNumber - right.absolutePageNumber)
    .map(({ page, absolutePageNumber }, index) => ({
      page,
      absolutePageNumber,
      absolutePageCount: pages.length,
      rangePageNumber: index + 1,
      rangePageCount,
    }));
}

export function getBookPagesForRange(document: ContentDocument, startPage: number | null, endPage: number | null): LayoutV2Page[] {
  return getBookPageViewsForRange(document, startPage, endPage).map(({ page }) => page);
}

export function getAllBookPageViews(document: ContentDocument): BookPageView[] {
  const pages = document.pageLayout?.pages ?? [];
  return pages.map((page, index) => ({
    page,
    absolutePageNumber: getAbsolutePageNumber(page, index),
    absolutePageCount: pages.length,
    rangePageNumber: index + 1,
    rangePageCount: pages.length,
  }));
}