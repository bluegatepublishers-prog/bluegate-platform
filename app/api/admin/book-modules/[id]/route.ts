import { Prisma, SecurityAuditOutcome } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  authorizePublisherAdminApi,
  publisherAdminNotFound,
} from "@/lib/publisher-admin-authorization";
import {
  publisherAdminAuditActor,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";

const UPDATE_FIELDS = new Set([
  "title",
  "displayOrder",
  "description",
  "published",
]);
const MOVE_FIELDS = new Set(["parentType", "parentId", "displayOrder"]);

class MoveError extends Error {}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const { id } = await params;
  const parsed = await readPayload(request);
  if (!parsed.ok) return parsed.response;

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        if (parsed.mode === "move") {
          const current = await tx.bookModule.findFirst({
            where: {
              id,
              book: { publisherId: access.actor.publisherId },
            },
            select: { id: true, bookId: true, chapterId: true },
          });
          if (!current) return null;
          if (
            parsed.parentType !== "CHAPTER" ||
            parsed.parentId === current.id
          ) {
            throw new MoveError(
              "A Module can only be moved to a valid Chapter.",
            );
          }
          const destination = await tx.bookChapter.findFirst({
            where: {
              id: parsed.parentId,
              archived: false,
              book: {
                publisherId: access.actor.publisherId,
                archived: false,
              },
            },
            select: { id: true, bookId: true, unitId: true },
          });
          if (!destination) return null;

          if (
            current.bookId !== destination.bookId ||
            current.chapterId !== destination.id
          ) {
            const topics = await tx.bookTopic.findMany({
              where: { moduleId: current.id },
              select: { id: true },
            });
            const topicIds = topics.map((item) => item.id);
            await tx.bookModule.update({
              where: { id: current.id },
              data: {
                bookId: destination.bookId,
                chapterId: destination.id,
                unitId: destination.unitId,
              },
            });
            if (topicIds.length) {
              await tx.bookTopic.updateMany({
                where: { id: { in: topicIds } },
                data: {
                  bookId: destination.bookId,
                  chapterId: destination.id,
                },
              });
            }
            if (current.bookId !== destination.bookId) {
              await tx.bookResourceLink.updateMany({
                where: {
                  OR: [
                    { moduleId: current.id },
                    ...(topicIds.length
                      ? [{ topicId: { in: topicIds } }]
                      : []),
                  ],
                },
                data: { bookId: destination.bookId },
              });
            }
            await compactModules(tx, current.bookId, current.chapterId);
          }
          await placeModule(
            tx,
            destination.bookId,
            destination.id,
            current.id,
            parsed.position,
          );
          const node = await tx.bookModule.findUnique({
            where: { id: current.id },
          });
          await writeSecurityAuditEvent(tx, {
            actor: publisherAdminAuditActor(access.actor),
            action: "publisher.curriculum.module.update",
            targetType: "BookModule",
            targetId: current.id,
            outcome: SecurityAuditOutcome.SUCCESS,
            metadata: {
              changedFields: [
                "bookId",
                "chapterId",
                "unitId",
                "displayOrder",
              ],
              destinationChapterId: destination.id,
            },
          });
          return node;
        }

        const current = await tx.bookModule.findFirst({
          where: { id, book: { publisherId: access.actor.publisherId } },
          select: { id: true, publishedAt: true },
        });
        if (!current) return null;
        const node = await tx.bookModule.update({
          where: { id: current.id },
          data: {
            ...parsed.data,
            ...(parsed.published === undefined
              ? {}
              : {
                  published: parsed.published,
                  publishedAt: parsed.published
                    ? current.publishedAt ?? new Date()
                    : null,
                }),
          },
        });
        await writeSecurityAuditEvent(tx, {
          actor: publisherAdminAuditActor(access.actor),
          action: "publisher.curriculum.module.update",
          targetType: "BookModule",
          targetId: node.id,
          outcome: SecurityAuditOutcome.SUCCESS,
          metadata: { changedFields: Object.keys(parsed.data) },
        });
        return node;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!updated) return publisherAdminNotFound();
    revalidatePath("/admin/books");
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof MoveError) return bad(error.message).response;
    throw error;
  }
}

async function compactModules(
  tx: Prisma.TransactionClient,
  bookId: string,
  chapterId: string,
) {
  const siblings = await tx.bookModule.findMany({
    where: { bookId, chapterId },
    orderBy: [{ displayOrder: "asc" }, { title: "asc" }, { id: "asc" }],
    select: { id: true, displayOrder: true },
  });
  await Promise.all(
    siblings.map((item, index) =>
      item.displayOrder === index
        ? Promise.resolve()
        : tx.bookModule.update({
            where: { id: item.id },
            data: { displayOrder: index },
          }),
    ),
  );
}

async function placeModule(
  tx: Prisma.TransactionClient,
  bookId: string,
  chapterId: string,
  nodeId: string,
  requestedIndex: number | undefined,
) {
  const siblings = await tx.bookModule.findMany({
    where: { bookId, chapterId },
    orderBy: [{ displayOrder: "asc" }, { title: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const without = siblings.filter((item) => item.id !== nodeId);
  without.splice(clampIndex(requestedIndex, without.length), 0, { id: nodeId });
  await Promise.all(
    without.map((item, displayOrder) =>
      tx.bookModule.update({
        where: { id: item.id },
        data: { displayOrder },
      }),
    ),
  );
}

async function readPayload(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return bad("Provide a valid update payload.");
  }
  const input = body as Record<string, unknown>;
  const moving = "parentType" in input || "parentId" in input;
  const fields = moving ? MOVE_FIELDS : UPDATE_FIELDS;
  const keys = Object.keys(input);
  if (!keys.length) return bad("Provide at least one field to update.");
  const unsupported = keys.find((key) => !fields.has(key));
  if (unsupported) return bad(`Unsupported field: ${unsupported}.`);
  if (moving) {
    const parentId = text(input.parentId);
    if (input.parentType !== "CHAPTER" || !parentId) {
      return bad("A Module can only be moved to a valid Chapter.");
    }
    const position = orderValue(input.displayOrder, "Display order");
    if (!position.valid) return bad(position.message);
    return {
      ok: true as const,
      mode: "move" as const,
      parentType: "CHAPTER" as const,
      parentId,
      position: position.value,
    };
  }
  const data: {
    title?: string;
    displayOrder?: number;
    description?: string | null;
    published?: boolean;
  } = {};
  if ("title" in input) {
    const title = text(input.title);
    if (!title) return bad("Title is required.");
    data.title = title;
  }
  if ("displayOrder" in input) {
    const position = orderValue(input.displayOrder, "Display order");
    if (!position.valid || position.value === undefined) {
      return bad(position.message);
    }
    data.displayOrder = position.value;
  }
  if ("description" in input) {
    if (input.description !== null && typeof input.description !== "string") {
      return bad("Description must be text.");
    }
    data.description =
      typeof input.description === "string"
        ? input.description.trim() || null
        : null;
  }
  if ("published" in input) {
    if (typeof input.published !== "boolean") {
      return bad("Published must be true or false.");
    }
    data.published = input.published;
  }
  return {
    ok: true as const,
    mode: "update" as const,
    data,
    published: data.published,
  };
}

function orderValue(value: unknown, label: string) {
  if (value === undefined) {
    return { valid: true, value: undefined, message: "" };
  }
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return {
      valid: false,
      value: undefined,
      message: `${label} must be a non-negative integer.`,
    };
  }
  return { valid: true, value, message: "" };
}

function clampIndex(value: number | undefined, maximum: number) {
  return Math.min(Math.max(value ?? maximum, 0), maximum);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function bad(message: string) {
  return {
    ok: false as const,
    response: NextResponse.json({ message }, { status: 400 }),
  };
}
