export function clampV2PageNumber(pageNumber: number, pageCount: number) {
  if (pageCount <= 0) return 0;
  if (!Number.isFinite(pageNumber)) return 1;
  return Math.min(pageCount, Math.max(1, Math.trunc(pageNumber)));
}

export function getV2PageByNumber<T extends { id: string }>(pages: T[], pageNumber: number) {
  const clamped = clampV2PageNumber(pageNumber, pages.length);
  return clamped > 0 ? pages[clamped - 1] : undefined;
}
