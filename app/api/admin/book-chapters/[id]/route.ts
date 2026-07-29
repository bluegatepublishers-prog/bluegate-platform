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
  "sortOrder",
  "description",
  "published",
]);
const MOVE_FIELDS = new Set(["parentType", "parentId", "sortOrder"]);

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
          const current = await tx.bookChapter.findFirst({
            where: {
              id,
              book: { publisherId: access.actor.publisherId },
            },
            select: {
              id: true,
              bookId: true,
              partId: true,
              unitId: true,
              slug: true,
              chapterNumber: true,
            },
          });
          if (!current) return null;
          if (parsed.parentId === current.id) {
            throw new MoveError("A Chapter cannot be moved into itself.");
          }
          const destination = await resolveDestination(
            tx,
            access.actor.publisherId,
            parsed.parentType,
            parsed.parentId,
          );
          if (!destination) return null;

          const oldGroup = groupKey(
            current.bookId,
            current.partId,
            current.unitId,
          );
          const newGroup = groupKey(
            destination.bookId,
            destination.partId,
            destination.unitId,
          );
          if (current.bookId !== destination.bookId) {
            const collision = await tx.bookChapter.findFirst({
              where: {
                bookId: destination.bookId,
                id: { not: current.id },
                OR: [
                  { slug: current.slug },
                  { chapterNumber: current.chapterNumber },
                ],
              },
              select: { id: true },
            });
            if (collision) {
              throw new MoveError(
                "The destination Book already has this Chapter slug or chapter number.",
              );
            }
          }
          if (oldGroup !== newGroup) {
            await moveChapterSubtree(
              tx,
              current.id,
              destination.bookId,
              destination.partId,
              destination.unitId,
              current.bookId !== destination.bookId,
            );
            await compactChapters(
              tx,
              current.bookId,
              current.partId,
              current.unitId,
            );
          }
          await placeChapter(
            tx,
            destination.bookId,
            destination.partId,
            destination.unitId,
            current.id,
            parsed.position,
          );
          const node = await tx.bookChapter.findUnique({
            where: { id: current.id },
          });
          await writeSecurityAuditEvent(tx, {
            actor: publisherAdminAuditActor(access.actor),
            action: "publisher.curriculum.chapter.update",
            targetType: "BookChapter",
            targetId: current.id,
            outcome: SecurityAuditOutcome.SUCCESS,
            metadata: {
              changedFields: ["bookId", "partId", "unitId", "sortOrder"],
              destinationBookId: destination.bookId,
              destinationPartId: destination.partId ?? "",
              destinationUnitId: destination.unitId ?? "",
            },
          });
          return node;
        }

        const current = await tx.bookChapter.findFirst({
          where: { id, book: { publisherId: access.actor.publisherId } },
          select: { id: true, publishedAt: true },
        });
        if (!current) return null;
        const node = await tx.bookChapter.update({
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
          action: "publisher.curriculum.chapter.update",
          targetType: "BookChapter",
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

async function resolveDestination(
  tx: Prisma.TransactionClient,
  publisherId: string,
  parentType: "BOOK" | "PART" | "UNIT",
  parentId: string,
) {
  if (parentType === "BOOK") {
    const book = await tx.book.findFirst({
      where: { id: parentId, publisherId, archived: false },
      select: { id: true },
    });
    return book
      ? {
          bookId: book.id,
          partId: null as string | null,
          unitId: null as string | null,
        }
      : null;
  }
  if (parentType === "PART") {
    const part = await tx.bookPart.findFirst({
      where: {
        id: parentId,
        archived: false,
        book: { publisherId, archived: false },
      },
      select: { id: true, bookId: true },
    });
    return part
      ? { bookId: part.bookId, partId: part.id, unitId: null as string | null }
      : null;
  }
  const unit = await tx.bookUnit.findFirst({
    where: {
      id: parentId,
      archived: false,
      book: { publisherId, archived: false },
    },
    select: { id: true, bookId: true, partId: true },
  });
  return unit
    ? { bookId: unit.bookId, partId: unit.partId, unitId: unit.id }
    : null;
}

async function moveChapterSubtree(
  tx: Prisma.TransactionClient,
  chapterId: string,
  destinationBookId: string,
  destinationPartId: string | null,
  destinationUnitId: string | null,
  crossingBooks: boolean,
) {
  const modules = await tx.bookModule.findMany({
    where: { chapterId },
    select: { id: true },
  });
  const moduleIds = modules.map((item) => item.id);
  const topics = await tx.bookTopic.findMany({
    where: { chapterId },
    select: { id: true },
  });
  const topicIds = topics.map((item) => item.id);

  await tx.bookChapter.update({
    where: { id: chapterId },
    data: {
      bookId: destinationBookId,
      partId: destinationPartId,
      unitId: destinationUnitId,
    },
  });
  if (moduleIds.length) {
    await tx.bookModule.updateMany({
      where: { id: { in: moduleIds } },
      data: {
        bookId: destinationBookId,
        unitId: destinationUnitId,
      },
    });
  }
  if (topicIds.length) {
    await tx.bookTopic.updateMany({
      where: { id: { in: topicIds } },
      data: { bookId: destinationBookId },
    });
  }
  if (crossingBooks) {
    await tx.bookResourceLink.updateMany({
      where: {
        OR: [
          { chapterId },
          ...(moduleIds.length ? [{ moduleId: { in: moduleIds } }] : []),
          ...(topicIds.length ? [{ topicId: { in: topicIds } }] : []),
        ],
      },
      data: { bookId: destinationBookId },
    });
  }
}

async function compactChapters(
  tx: Prisma.TransactionClient,
  bookId: string,
  partId: string | null,
  unitId: string | null,
) {
  const siblings = await tx.bookChapter.findMany({
    where: siblingWhere(bookId, partId, unitId),
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }, { id: "asc" }],
    select: { id: true, sortOrder: true },
  });
  await Promise.all(
    siblings.map((item, index) =>
      item.sortOrder === index
        ? Promise.resolve()
        : tx.bookChapter.update({
            where: { id: item.id },
            data: { sortOrder: index },
          }),
    ),
  );
}

async function placeChapter(
  tx: Prisma.TransactionClient,
  bookId: string,
  partId: string | null,
  unitId: string | null,
  nodeId: string,
  requestedIndex: number | undefined,
) {
  const siblings = await tx.bookChapter.findMany({
    where: siblingWhere(bookId, partId, unitId),
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const without = siblings.filter((item) => item.id !== nodeId);
  without.splice(clampIndex(requestedIndex, without.length), 0, { id: nodeId });
  await Promise.all(
    without.map((item, sortOrder) =>
      tx.bookChapter.update({
        where: { id: item.id },
        data: { sortOrder },
      }),
    ),
  );
}

function siblingWhere(
  bookId: string,
  partId: string | null,
  unitId: string | null,
) {
  return unitId
    ? { bookId, unitId }
    : partId
      ? { bookId, partId, unitId: null }
      : { bookId, partId: null, unitId: null };
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
    if (
      (input.parentType !== "BOOK" &&
        input.parentType !== "PART" &&
        input.parentType !== "UNIT") ||
      !parentId
    ) {
      return bad(
        "A Chapter can only be moved to a valid Book, Part, or Unit.",
      );
    }
    const position = orderValue(input.sortOrder, "Sort order");
    if (!position.valid) return bad(position.message);
    return {
      ok: true as const,
      mode: "move" as const,
      parentType: input.parentType as "BOOK" | "PART" | "UNIT",
      parentId,
      position: position.value,
    };
  }
  const data: {
    title?: string;
    sortOrder?: number;
    description?: string | null;
    published?: boolean;
  } = {};
  if ("title" in input) {
    const title = text(input.title);
    if (!title) return bad("Title is required.");
    data.title = title;
  }
  if ("sortOrder" in input) {
    const position = orderValue(input.sortOrder, "Sort order");
    if (!position.valid || position.value === undefined) {
      return bad(position.message);
    }
    data.sortOrder = position.value;
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

function groupKey(
  bookId: string,
  partId: string | null,
  unitId: string | null,
) {
  return `${bookId}:${unitId ? `UNIT:${unitId}` : partId ? `PART:${partId}` : "BOOK"}`;
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
