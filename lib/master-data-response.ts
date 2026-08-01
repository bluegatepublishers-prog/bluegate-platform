import { NextResponse } from "next/server";
import { MasterDataError } from "@/lib/master-data";

export function masterDataErrorResponse(error: unknown, fallback: string) {
  if (error instanceof MasterDataError) return NextResponse.json({ message: error.message }, { status: error.status });
  console.warn(fallback, { code: "MASTER_DATA_OPERATION_FAILED" });
  return NextResponse.json({ message: fallback }, { status: 500 });
}
