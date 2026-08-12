import "server-only";

import { inspectPdfBook, loadServerPdfJs } from "@/lib/pdf-book-validation";
import type { LayoutV2Page } from "@/lib/content-layout-v2";
import { extractPdfPageText } from "@/lib/pdf-text-extraction";

function pageId(index: number) {
  return `pdf-page-${index + 1}-${crypto.randomUUID()}`;
}

export async function createV2PagesFromPdf(
  data: Uint8Array,
): Promise<LayoutV2Page[]> {
  const inspection = await inspectPdfBook(data);
  const extractedText = await extractPdfPageText(data);

  const pdfjs = await loadServerPdfJs();

  const loadingTask = pdfjs.getDocument({
    data: data.slice(),
    disableAutoFetch: true,
    disableStream: true,
    useWorkerFetch: false,
    stopAtErrors: true,
    disableFontFace: true,
  });

  try {
    const document = await loadingTask.promise;
    const pages: LayoutV2Page[] = [];

    for (let index = 0; index < inspection.pageCount; index += 1) {
      const source = await document.getPage(index + 1);
      const viewport = source.getViewport({ scale: 1 });

      pages.push({
        id: pageId(index),
        order: index,
        width: viewport.width,
        height: viewport.height,
        unit: "px",
        frames: [],
        readAloud: {
          text: extractedText[index]?.text ?? "",
          source: "PDF_TEXT",
          reviewed: false,
        },
        pdfBackground: {
          source: "BOOK_FULL_PDF",
          pageNumber: index + 1,
        },
      });

      source.cleanup();
    }

    document.cleanup();

    return pages;
  } finally {
    await loadingTask.destroy();
  }
}
