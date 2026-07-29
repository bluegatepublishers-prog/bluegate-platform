import { BookContentTargetType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireQrAdmin } from "@/lib/qr/qr-authorization";
import {
  archiveQrCode,
  getQrCode,
  jsonObject,
  qrErrorResponse,
  rollbackQrCode,
  updateQrCode,
} from "@/lib/qr/qr-service";

export const dynamic = "force-dynamic";

type QrRouteContext = {
  params: Promise<{ id: string }>;
};

type QrResponseRecord = Awaited<ReturnType<typeof getQrCode>>;

function fallbackTarget(type: BookContentTargetType, id: string | null) {
  const label = type.charAt(0) + type.slice(1).toLowerCase();
  return {
    type,
    id,
    title: id ? `${label} · ${id}` : `${label} unavailable`,
    subtitle: label,
  };
}

async function withTarget(qrCode: QrResponseRecord) {
  if (qrCode.targetType === BookContentTargetType.BOOK) {
    return {
      ...qrCode,
      target: {
        type: qrCode.targetType,
        id: qrCode.book.id,
        title: qrCode.book.title,
        subtitle: "Book",
      },
    };
  }

  const targetId =
    qrCode.targetType === BookContentTargetType.PART
      ? qrCode.partId
      : qrCode.targetType === BookContentTargetType.UNIT
        ? qrCode.unitId
        : qrCode.targetType === BookContentTargetType.CHAPTER
          ? qrCode.chapterId
          : qrCode.targetType === BookContentTargetType.MODULE
            ? qrCode.moduleId
            : qrCode.topicId;

  if (!targetId) {
    return {
      ...qrCode,
      target: fallbackTarget(qrCode.targetType, null),
    };
  }

  let target: { id: string; title: string; chapterNumber?: number } | null =
    null;
  switch (qrCode.targetType) {
    case BookContentTargetType.PART:
      target = await prisma.bookPart.findUnique({
        where: { id: targetId },
        select: { id: true, title: true },
      });
      break;
    case BookContentTargetType.UNIT:
      target = await prisma.bookUnit.findUnique({
        where: { id: targetId },
        select: { id: true, title: true },
      });
      break;
    case BookContentTargetType.CHAPTER:
      target = await prisma.bookChapter.findUnique({
        where: { id: targetId },
        select: { id: true, title: true, chapterNumber: true },
      });
      break;
    case BookContentTargetType.MODULE:
      target = await prisma.bookModule.findUnique({
        where: { id: targetId },
        select: { id: true, title: true },
      });
      break;
    case BookContentTargetType.TOPIC:
      target = await prisma.bookTopic.findUnique({
        where: { id: targetId },
        select: { id: true, title: true },
      });
      break;
  }

  return {
    ...qrCode,
    target: target
      ? {
          type: qrCode.targetType,
          id: target.id,
          title: target.title,
          subtitle:
            qrCode.targetType === BookContentTargetType.CHAPTER &&
            target.chapterNumber !== undefined
              ? `Chapter ${target.chapterNumber}`
              : qrCode.targetType.charAt(0) +
                qrCode.targetType.slice(1).toLowerCase(),
        }
      : fallbackTarget(qrCode.targetType, targetId),
  };
}

export async function GET(_request: Request, context: QrRouteContext) {
  try {
    const actor = await requireQrAdmin();
    const { id } = await context.params;
    const qrCode = await getQrCode(actor, id);
    return Response.json({ qrCode: await withTarget(qrCode) });
  } catch (error) {
    return qrErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: QrRouteContext) {
  try {
    const actor = await requireQrAdmin();
    const { id } = await context.params;
    const input = jsonObject(await request.json());
    if (input.rollbackRevisionId !== undefined) {
      if (
        Object.keys(input).length !== 1 ||
        typeof input.rollbackRevisionId !== "string" ||
        !input.rollbackRevisionId.trim()
      ) {
        return Response.json(
          { error: "rollbackRevisionId must be the only supplied field." },
          { status: 400 },
        );
      }
      const qrCode = await rollbackQrCode(
        actor,
        id,
        input.rollbackRevisionId.trim(),
      );
      return Response.json({ qrCode: await withTarget(qrCode) });
    }
    const qrCode = await updateQrCode(actor, id, input);
    return Response.json({ qrCode: await withTarget(qrCode) });
  } catch (error) {
    return qrErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: QrRouteContext) {
  try {
    const actor = await requireQrAdmin();
    const { id } = await context.params;
    const qrCode = await archiveQrCode(actor, id);
    return Response.json({
      success: true,
      qrCode: await withTarget(qrCode),
    });
  } catch (error) {
    return qrErrorResponse(error);
  }
}
