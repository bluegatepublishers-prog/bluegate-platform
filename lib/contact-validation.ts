type ContactFieldErrors = Partial<Record<"name" | "email" | "phone" | "schoolName" | "subject" | "message", string>>;

export type ContactSubmission = {
  name: string;
  email: string;
  phone?: string;
  schoolName?: string;
  subject?: string;
  message: string;
};

export type ContactValidationResult =
  | { ok: true; data: ContactSubmission }
  | { ok: false; status: 400 | 503 | 502; message: string; errors?: ContactFieldErrors };

const LIMITS = {
  name: 100,
  email: 254,
  phone: 30,
  subject: 200,
  message: 5000,
  schoolName: 100,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readTrimmedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return undefined;
  return trimmed;
}

function validateOptionalString(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return { value: undefined as string | undefined };
  if (typeof value !== "string") return { error: "Value must be a string." };
  const trimmed = value.trim();
  if (!trimmed) return { value: undefined as string | undefined };
  if (trimmed.length > maxLength) return { error: `Value must be ${maxLength} characters or fewer.` };
  return { value: trimmed };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= LIMITS.email;
}

export async function parseContactSubmission(request: Request): Promise<ContactValidationResult> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      status: 400,
      message: "Malformed JSON body.",
    };
  }

  if (!isRecord(body)) {
    return {
      ok: false,
      status: 400,
      message: "Request body must be a JSON object.",
    };
  }

  const errors: ContactFieldErrors = {};

  const name = readTrimmedString(body.name, LIMITS.name);
  if (!name) errors.name = "Name is required and must be 100 characters or fewer.";

  const email = readTrimmedString(body.email, LIMITS.email);
  if (!email || !isValidEmail(email)) {
    errors.email = "Enter a valid email address up to 254 characters.";
  }

  const phoneCheck = validateOptionalString(body.phone, LIMITS.phone);
  const schoolNameCheck = validateOptionalString(body.schoolName, LIMITS.schoolName);
  const subjectCheck = validateOptionalString(body.subject, LIMITS.subject);

  if (phoneCheck.error) errors.phone = "Phone must be 30 characters or fewer.";
  if (schoolNameCheck.error) errors.schoolName = "School / Organisation must be 100 characters or fewer.";
  if (subjectCheck.error) errors.subject = "Subject must be 200 characters or fewer.";

  const message = readTrimmedString(body.message, LIMITS.message);
  if (!message) errors.message = "Message is required and must be 5,000 characters or fewer.";

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      status: 400,
      message: "Please correct the highlighted fields.",
      errors,
    };
  }

  return {
    ok: true,
    data: {
      name: name as string,
      email: email as string,
      message: message as string,
      phone: "value" in phoneCheck ? phoneCheck.value : undefined,
      schoolName: "value" in schoolNameCheck ? schoolNameCheck.value : undefined,
      subject: "value" in subjectCheck ? subjectCheck.value : undefined,
    },
  };
}
