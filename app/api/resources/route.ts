import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/authz";
import { getTeacherResourceScope } from "@/lib/resource-audience";

export async function GET() {
  const user=await getApiUser(["TEACHER"]);if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const scope=await getTeacherResourceScope(user.id!);if(!scope)return NextResponse.json({message:"Resource access unavailable."},{status:403});return NextResponse.json(
    await prisma.resource.findMany({
      where: scope.where,
      orderBy: { createdAt: "desc" },
    })
  );
}
