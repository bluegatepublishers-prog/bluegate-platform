import type { WorksheetBlockData } from "@/lib/worksheet-object";
import { WORKSHEET_QUESTION_LABELS } from "@/lib/worksheet-object";

export type WorksheetExportOptions = { includeAnswers?: boolean };

export function worksheetFilename(title: string, includeAnswers = false) {
  const safe = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "worksheet";
  return `${safe}${includeAnswers ? "-answer-key" : ""}.pdf`;
}

export function worksheetToPlainLines(worksheet: WorksheetBlockData, options: WorksheetExportOptions = {}) {
  const includeAnswers = options.includeAnswers === true;
  const lines: string[] = [];
  lines.push("BLUEGATE WORKSHEET", "");
  if (worksheet.title) lines.push(worksheet.title, "");
  if (worksheet.description) lines.push(worksheet.description, "");
  if (worksheet.instructions) lines.push("Instructions", worksheet.instructions, "");
  if (worksheet.marks !== undefined || worksheet.difficulty || worksheet.duration) {
    lines.push([worksheet.marks !== undefined ? `${worksheet.marks} marks` : "", worksheet.difficulty ?? "", worksheet.duration ?? ""].filter(Boolean).join(" | "), "");
  }
  worksheet.questions.forEach((question, index) => {
    lines.push(`${index + 1}. ${WORKSHEET_QUESTION_LABELS[question.type]} - ${question.prompt || "Untitled question"}`);
    if (question.instructions) lines.push(`   ${question.instructions}`);
    if (question.type === "mcq") question.options?.forEach((option, optionIndex) => lines.push(`   ${String.fromCharCode(65 + optionIndex)}. ${option.text}`));
    if (question.type === "trueFalse") lines.push("   True / False: ____________________");
    if (question.type === "match") question.pairs?.forEach((pair) => lines.push(`   ${pair.left}    |    ${pair.right}`));
    if (question.type === "assertionReason") { lines.push(`   Assertion: ${question.assertion ?? ""}`, `   Reason: ${question.reason ?? ""}`); question.assertionOptions?.forEach((option, optionIndex) => lines.push(`   ${String.fromCharCode(65 + optionIndex)}. ${option.text}`)); }
    if (question.type === "caseBased") { if (question.caseText) lines.push(`   Case: ${question.caseText}`); question.subQuestions?.forEach((entry, subIndex) => lines.push(`   ${index + 1}.${subIndex + 1} ${entry.prompt}`)); }
    if (question.type !== "mcq" && question.type !== "trueFalse" && question.type !== "match" && question.type !== "assertionReason" && question.type !== "caseBased") lines.push("   ________________________________________________________________");
    if (question.resourceId) lines.push("   Resource reference: linked Bluegate resource");
    if (includeAnswers) {
      if (question.answer) lines.push(`   Answer: ${question.answer}`);
      if (question.correctOption) lines.push(`   Correct option: ${question.options?.find((option) => option.id === question.correctOption)?.text ?? question.correctOption}`);
      if (question.trueFalseAnswer) lines.push(`   Correct answer: ${question.trueFalseAnswer}`);
      if (question.blanks?.length) lines.push(`   Blank answers: ${question.blanks.join("; ")}`);
      if (question.explanation) lines.push(`   Explanation: ${question.explanation}`);
    }
    lines.push("");
  });
  if (includeAnswers && worksheet.teacherNote) lines.push("Teacher note", worksheet.teacherNote);
  return lines;
}

export function createWorksheetPdf(worksheet: WorksheetBlockData, options: WorksheetExportOptions = {}) {
  const lines = worksheetToPlainLines(worksheet, options).flatMap((line) => wrapPdfLine(line, 94));
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 48) pages.push(lines.slice(index, index + 48));
  if (!pages.length) pages.push([]);
  const objects: string[] = [];
  const pageIds: number[] = [];
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pagesId = objects.length + 1;
  objects.push("");
  for (const pageLines of pages) {
    const content = ["BT", "/F1 10 Tf", "50 770 Td", ...pageLines.flatMap((line, index) => [`(${escapePdf(line)}) Tj`, index === pageLines.length - 1 ? "" : "0 -15 Td"]).filter(Boolean), "ET"].join("\n");
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  const pagesObjectId = addObject(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`, pagesId);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`);
  return new TextEncoder().encode(buildPdf(objects, catalogId));

  function addObject(value: string, forcedId?: number) {
    const id = forcedId ?? objects.length + 1;
    if (forcedId && objects.length < forcedId - 1) while (objects.length < forcedId - 1) objects.push("");
    objects[id - 1] = value;
    return id;
  }
}

export function worksheetToPrintableHtml(worksheet: WorksheetBlockData, options: WorksheetExportOptions = {}) {
  const includeAnswers = options.includeAnswers === true;
  const lines = worksheetToPlainLines(worksheet, options);
  return `<main class="worksheet-print">${lines.map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`).join("")}${includeAnswers && worksheet.teacherNote ? "" : ""}</main>`;
}

function wrapPdfLine(value: string, width: number) {
  if (!value) return [""];
  const result: string[] = [];
  let remaining = value;
  while (remaining.length > width) { const cut = remaining.lastIndexOf(" ", width); const index = cut > 0 ? cut : width; result.push(remaining.slice(0, index)); remaining = remaining.slice(index).trimStart(); }
  result.push(remaining);
  return result;
}

function escapePdf(value: string) { return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?"); }
function escapeHtml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
function buildPdf(objects: string[], catalogId: number) { let output = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n"; const offsets = [0]; objects.forEach((object, index) => { offsets.push(output.length); output += `${index + 1} 0 obj\n${object}\nendobj\n`; }); const xref = output.length; output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`; for (let index = 1; index < offsets.length; index += 1) output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`; output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`; return output; }
