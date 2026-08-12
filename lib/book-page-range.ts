export class BookPageRangeError extends Error {
  constructor(message: string) { super(message); this.name = "BookPageRangeError"; }
}

export type BookPageRange = { startPage: number | null; endPage: number | null };

function present(value: number | null | undefined) { return value !== null && value !== undefined; }

export function validateBookPageRange(range: BookPageRange, totalPages: number | null, label = "Book item") {
  if (!present(range.startPage) && !present(range.endPage)) return;
  if (!present(range.startPage) || !present(range.endPage)) throw new BookPageRangeError(`Set both a start and an end page for the ${label.toLowerCase()}.`);
  if (!Number.isInteger(range.startPage) || !Number.isInteger(range.endPage)) throw new BookPageRangeError(`${label} pages must be whole numbers.`);
  if (range.startPage < 1) throw new BookPageRangeError(`${label} start page must be at least 1.`);
  if (range.endPage < range.startPage) throw new BookPageRangeError(`${label} end page must not be before its start page.`);
  if (!totalPages || range.endPage > totalPages) throw new BookPageRangeError(`${label} end page must be within the uploaded book PDF.`);
}

export function validateRangeWithinParent(range: BookPageRange, parent: BookPageRange, label: string, parentLabel: string) {
  if (!present(range.startPage) && !present(range.endPage)) return;
  const parentIsUnmapped = !present(parent.startPage) && !present(parent.endPage);
  if (parentIsUnmapped) return;
  if (!present(parent.startPage) || !present(parent.endPage)) throw new BookPageRangeError(`Set both start and end pages for the parent ${parentLabel.toLowerCase()} before mapping this ${label.toLowerCase()}.`);
  if (range.startPage! < parent.startPage || range.endPage! > parent.endPage) throw new BookPageRangeError(`${label} range must be within its parent ${parentLabel.toLowerCase()} range.`);
}

export function validateChapterPageRange(range: BookPageRange, totalPages: number | null) {
  validateBookPageRange(range, totalPages, "Chapter");
}

export function validateModulePageRange(range: BookPageRange, chapter: BookPageRange, totalPages: number | null) {
  validateBookPageRange(range, totalPages, "Module");
  validateRangeWithinParent(range, chapter, "Module", "chapter");
}

export function validatePartPageRange(range: BookPageRange, totalPages: number | null) {
  validateBookPageRange(range, totalPages, "Part");
}

export function validateUnitPageRange(range: BookPageRange, part: BookPageRange | null, totalPages: number | null) {
  validateBookPageRange(range, totalPages, "Unit");
  if (part) validateRangeWithinParent(range, part, "Unit", "part");
}

export function validateChapterWithinUnit(range: BookPageRange, unit: BookPageRange | null) {
  if (unit) validateRangeWithinParent(range, unit, "Chapter", "unit");
}

export function validateChapterWithinPart(range: BookPageRange, part: BookPageRange | null) {
  if (part) validateRangeWithinParent(range, part, "Chapter", "part");
}

export function validateFrontMatterPageRange(range: BookPageRange, totalPages: number | null) {
  validateBookPageRange(range, totalPages, "Front matter");
}