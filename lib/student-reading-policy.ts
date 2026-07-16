const MAX_PDF_PAGES = 100_000;

export type ReadingPositionDecision =
  | { ok: true; lastPage: number; totalPages: number | null; completed: boolean }
  | { ok: false; message: "We could not save your reading position." };

export function validateReadingPosition(
  currentPage: unknown,
  totalPages: unknown,
): ReadingPositionDecision {
  if (!Number.isInteger(currentPage) || Number(currentPage) < 1 || Number(currentPage) > MAX_PDF_PAGES) {
    return { ok: false, message: "We could not save your reading position." };
  }
  const hasTotal = totalPages !== null && totalPages !== undefined;
  if (hasTotal && (!Number.isInteger(totalPages) || Number(totalPages) < 1 || Number(totalPages) > MAX_PDF_PAGES)) {
    return { ok: false, message: "We could not save your reading position." };
  }
  const safeTotal = hasTotal ? Number(totalPages) : null;
  const lastPage = safeTotal ? Math.min(Number(currentPage), safeTotal) : Number(currentPage);
  return {
    ok: true,
    lastPage,
    totalPages: safeTotal,
    completed: Boolean(safeTotal && lastPage === safeTotal),
  };
}

export function validateBookmarkPage(pageNumber: unknown, totalPages?: number | null) {
  const decision = validateReadingPosition(pageNumber, totalPages ?? null);
  if (!decision.ok) return null;
  return decision.lastPage;
}

export function readingProgressPercent(lastPage: number, totalPages: number | null) {
  if (!totalPages || totalPages < 1) return null;
  return Math.min(100, Math.max(0, Math.round((lastPage / totalPages) * 100)));
}
