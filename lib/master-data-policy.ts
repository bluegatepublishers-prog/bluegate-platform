import { z } from "zod";

export const RESERVED_MASTER_DATA_CODES = new Set([
  "BOARD", "CLASS", "SUBJECT", "BOOK_SERIES", "BOOK", "RESOURCE_TYPE", "ACADEMIC_YEAR",
]);

export function normalizeMasterDataCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const commonSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  code: z.string().transform(normalizeMasterDataCode).pipe(z.string().min(1, "Code is required.").max(80).regex(/^[A-Z][A-Z0-9_]*$/, "Use an uppercase code beginning with a letter.")),
  description: z.string().trim().max(500).optional().default(""),
  displayOrder: z.coerce.number().int().min(0, "Display order cannot be negative.").default(0),
  active: z.boolean().default(true),
});

export const boardInputSchema = commonSchema;
export const masterDataValueInputSchema = commonSchema;
export const masterDataDefinitionInputSchema = commonSchema.superRefine((value, context) => {
  if (RESERVED_MASTER_DATA_CODES.has(value.code)) {
    context.addIssue({ code: "custom", path: ["code"], message: "This code is reserved for core master data." });
  }
});
