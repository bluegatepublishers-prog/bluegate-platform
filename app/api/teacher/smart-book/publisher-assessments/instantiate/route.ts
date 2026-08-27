import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import {
  instantiatePublisherAssessmentFromSmartBookRelease,
  SmartBookAssessmentError,
  SMART_BOOK_ASSESSMENT_UNAVAILABLE,
} from "@/lib/smart-book-assessment";

const forbiddenOverrideKeys = new Set([
  "contentReleaseVersionId",
  "releaseId",
  "releaseVersionId",
  "versionNumber",
  "questionId",
  "questionIds",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as unknown;
    if (!isRecord(body) || Object.keys(body).some((key) => forbiddenOverrideKeys.has(key))) {
      throw new SmartBookAssessmentError(SMART_BOOK_ASSESSMENT_UNAVAILABLE, 400);
    }
    const result = await instantiatePublisherAssessmentFromSmartBookRelease({
      sectionId: requiredString(body.sectionId),
      sectionSubjectId: requiredString(body.sectionSubjectId),
      bookId: requiredString(body.bookId),
      publisherAssessmentId: requiredString(body.publisherAssessmentId),
      teachingPeriodId: optionalString(body.teachingPeriodId),
    });
    return NextResponse.json({ ok: true, ...result }, { status: result.reused ? 200 : 201 });
  } catch (error) {
    unstable_rethrow(error);
    const status = error instanceof SmartBookAssessmentError ? error.status : 404;
    return NextResponse.json({ ok: false, message: SMART_BOOK_ASSESSMENT_UNAVAILABLE }, { status });
  }
}

function requiredString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) throw new SmartBookAssessmentError(SMART_BOOK_ASSESSMENT_UNAVAILABLE, 400);
  return value;
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
