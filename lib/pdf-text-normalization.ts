export function normalizePdfTextItems(items: unknown): string {
  if (!Array.isArray(items)) return "";

  let text = "";
  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item) || typeof item.str !== "string") continue;
    const value = item.str.replace(/\s+/g, " ").trim();
    if (!value) continue;
    if (!text) {
      text = value;
    } else {
      text += ("hasEOL" in item && item.hasEOL === true ? "\n" : " ") + value;
    }
  }

  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}