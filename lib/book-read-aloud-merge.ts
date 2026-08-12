import type { ContentDocument } from "@/lib/content-document";
import type { LayoutV2PageReadAloud } from "@/lib/content-layout-v2";
import type { PdfPageText } from "@/lib/pdf-text-extraction";

export type PrepareBookReadAloudResult = {
  extractedPageCount: number;
  matchedPageCount: number;
  updatedPageCount: number;
  preservedManualCount: number;
  unmatchedPdfPages: number[];
  unmatchedV2Pages: number[];
};

function pageNumberFor(page: NonNullable<ContentDocument["pageLayout"]>["pages"][number]) {
  return page.pdfBackground?.source === "BOOK_FULL_PDF" && Number.isInteger(page.pdfBackground.pageNumber) && page.pdfBackground.pageNumber >= 1
    ? page.pdfBackground.pageNumber
    : undefined;
}

export function mergePdfReadAloudIntoDocument(
  document: ContentDocument,
  extractedPages: PdfPageText[],
): { document: ContentDocument; result: PrepareBookReadAloudResult } {
  const pages = document.pageLayout?.pages ?? [];
  const extractedByNumber = new Map(extractedPages.map((page) => [page.pageNumber, page]));
  const v2PageNumbers = pages.map(pageNumberFor).filter((pageNumber): pageNumber is number => pageNumber !== undefined);
  const matchedPageNumbers = new Set<number>();
  let updatedPageCount = 0;
  let preservedManualCount = 0;

  const nextPages = pages.map((page) => {
    const pageNumber = pageNumberFor(page);
    if (pageNumber === undefined) return page;
    const extracted = extractedByNumber.get(pageNumber);
    if (!extracted) return page;
    matchedPageNumbers.add(pageNumber);
    if (page.readAloud?.source === "MANUAL") {
      preservedManualCount += 1;
      return page;
    }
    updatedPageCount += 1;
    const readAloud: LayoutV2PageReadAloud = {
      text: extracted.text,
      source: "PDF_TEXT",
      reviewed: false,
    };
    return { ...page, readAloud };
  });

  const unmatchedPdfPages = extractedPages
    .map((page) => page.pageNumber)
    .filter((pageNumber) => !matchedPageNumbers.has(pageNumber));
  const unmatchedV2Pages = v2PageNumbers.filter((pageNumber) => !extractedByNumber.has(pageNumber));

  return {
    document: nextPages === pages ? document : { ...document, pageLayout: { ...document.pageLayout!, pages: nextPages } },
    result: {
      extractedPageCount: extractedPages.length,
      matchedPageCount: matchedPageNumbers.size,
      updatedPageCount,
      preservedManualCount,
      unmatchedPdfPages,
      unmatchedV2Pages,
    },
  };
}