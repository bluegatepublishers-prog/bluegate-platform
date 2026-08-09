import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";

import { AssignmentItemServiceError, getStudentAssignmentWork } from "@/lib/assignments/assignment-items";
import {
  deleteStudentWork,
  getStudentWorkItem,
  listStudentWork,
  upsertStudentWork,
  StudentWorkServiceError,
} from "@/lib/student-work";
import {
  STUDENT_WORK_TYPES,
  StudentWorkPolicyError,
  type StudentWorkTypeName,
} from "@/lib/student-work-policy";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorResponse(error: unknown) {
  if (error instanceof StudentWorkServiceError) {
    return NextResponse.json(
      { ok: false, status: error.code, message: error.message },
      { status: error.status },
    );
  }
  if (error instanceof StudentWorkPolicyError) {
    const status = error.code === "INVALID_PAYLOAD" ? 400 : error.code === "FORBIDDEN" ? 403 : 404;
    return NextResponse.json(
      { ok: false, status: error.code, message: error.code === "INVALID_PAYLOAD" ? error.message : "This Student Work target is not available." },
      { status },
    );
  }
  if (error instanceof AssignmentItemServiceError) {
    const status = error.code === "CONFLICT" ? 409 : error.code === "UNAUTHORIZED" || error.code === "ASSIGNMENT_NOT_FOUND" ? 404 : 400;
    const message = error.code === "CONFLICT"
      ? "This answer changed elsewhere. Reload before saving again."
      : error.code === "BOOK_NOT_ENTITLED"
        ? "This book is no longer available."
        : error.code === "ASSIGNMENT_LOCKED"
          ? "This assignment can no longer be changed."
        : error.code === "MISSING_TARGET" || error.code === "INVALID_TARGET"
          ? "This assignment content is no longer available."
          : "Your answer could not be saved. Try again.";
    return NextResponse.json({ ok: false, status: error.code, message }, { status });
  }
  return NextResponse.json(
    { ok: false, status: "SAVE_FAILED", message: "We could not save Student Work." },
    { status: 500 },
  );
}

function splitQuery(value: string | null) {
  return value
    ? value.split(",").map((entry) => entry.trim()).filter(Boolean)
    : undefined;
}

function parseTypes(value: string | null): StudentWorkTypeName[] | undefined {
  const entries = splitQuery(value);
  if (!entries) return undefined;
  if (entries.some((entry) => !STUDENT_WORK_TYPES.includes(entry as StudentWorkTypeName))) {
    throw new StudentWorkPolicyError("The Student Work type is invalid.", "INVALID_PAYLOAD");
  }
  return entries as StudentWorkTypeName[];
}

function assertClientBoundary(body: Record<string, unknown>) {
  const forbidden = [
    "bookId",
    "studentId",
    "schoolId",
    "publisherId",
    "academicYearId",
    "targetKey",
    "masterSourceHash",
    "targetSourceHash",
  ];
  if (forbidden.some((key) => key in body)) {
    throw new StudentWorkPolicyError("Client-owned scope fields are not accepted.", "INVALID_PAYLOAD");
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  try {
    const { bookId } = await params;
    const url = new URL(request.url);
    const assignmentId = url.searchParams.get("assignmentId");
    if (assignmentId) return NextResponse.json({ work: await getStudentAssignmentWork(assignmentId, bookId) });
    const workItemId = url.searchParams.get("workItemId");
    if (workItemId) return NextResponse.json(await getStudentWorkItem({ bookId, workItemId }));
    return NextResponse.json(await listStudentWork({
      bookId,
      moduleId: url.searchParams.get("moduleId") ?? undefined,
      pageIds: splitQuery(url.searchParams.get("pageIds")),
      types: parseTypes(url.searchParams.get("types")),
    }));
  } catch (error) {
    unstable_rethrow(error);
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  try {
    const { bookId } = await params;
    const body = await request.json().catch(() => null);
    if (!isRecord(body)) throw new StudentWorkPolicyError("Invalid Student Work request.", "INVALID_PAYLOAD");
    assertClientBoundary(body);
    if (typeof body.type !== "string" || !STUDENT_WORK_TYPES.includes(body.type as StudentWorkTypeName)) {
      throw new StudentWorkPolicyError("The Student Work type is invalid.", "INVALID_PAYLOAD");
    }
    const result = await upsertStudentWork({
      bookId,
      type: body.type as StudentWorkTypeName,
      target: body.target,
      payload: body.payload,
      expectedRevision: body.expectedRevision,
      recordAttempt: body.recordAttempt === true,
      assignmentItemId: body.assignmentItemId,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    unstable_rethrow(error);
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  try {
    const { bookId } = await params;
    const body = await request.json().catch(() => null);
    if (!isRecord(body) || typeof body.workItemId !== "string") {
      throw new StudentWorkPolicyError("A Student Work item is required.", "INVALID_PAYLOAD");
    }
    assertClientBoundary(body);
    return NextResponse.json(await deleteStudentWork({
      bookId,
      workItemId: body.workItemId,
      expectedRevision: body.expectedRevision,
    }));
  } catch (error) {
    unstable_rethrow(error);
    return errorResponse(error);
  }
}
