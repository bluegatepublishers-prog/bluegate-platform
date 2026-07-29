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

const FIELDS = new Set([
  "bookId",
  "parentType",
  "parentId",
  "title",
  "description",
  "published",
]);

export async function POST(request: Request) {
  const access = await authorizePublisherAdminApi();
  if (access.response) return access.response;
  const parsed = await readPayload(request);
  if (!parsed.ok) return parsed.response;

  const created = await prisma.$transaction(
    async (tx) => {
      const book = await tx.book.findFirst({
        where: {
          id: parsed.data.bookId,
          publisherId: access.actor.publisherId,
          archived: false,
        },
        select: { id: true },
      });
      if (!book) return null;

      let partId: string | null = null;
      if (parsed.data.parentType === "PART") {
        const part = await tx.bookPart.findFirst({
          where: {
            id: parsed.data.parentId,
            bookId: book.id,
            archived: false,
          },
          select: { id: true },
        });
        if (!part) return null;
        partId = part.id;
      }

      const order = await tx.bookUnit.aggregate({
        where: { bookId: book.id, partId },
        _max: { displayOrder: true },
      });
      const node = await tx.bookUnit.create({
        data: {
          bookId: book.id,
          partId,
          title: parsed.data.title,
          description: parsed.data.description,
          published: parsed.data.published,
          publishedAt: parsed.data.published ? new Date() : null,
          displayOrder: (order._max.displayOrder ?? -1) + 1,
        },
      });
      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(access.actor),
        action: "publisher.curriculum.unit.create",
        targetType: "BookUnit",
        targetId: node.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: {
          changedFields: [
            "bookId",
            "partId",
            "title",
            "description",
            "published",
            "displayOrder",
          ],
        },
      });
      return node;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (!created) return publisherAdminNotFound();
  revalidatePath("/admin/books");
  return NextResponse.json(created, { status: 201 });
}

async function readPayload(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return bad("Provide a valid create payload.");
  }
  const input = body as Record<string, unknown>;
  const unsupported = Object.keys(input).find((key) => !FIELDS.has(key));
  if (unsupported) return bad(`Unsupported field: ${unsupported}.`);
  const bookId = text(input.bookId);
  const parentId = text(input.parentId);
  const title = text(input.title);
  if (
    !bookId ||
    (input.parentType !== "BOOK" && input.parentType !== "PART") ||
    !parentId ||
    (input.parentType === "BOOK" && parentId !== bookId)
  ) {
    return bad("A Unit must belong to a valid Book or Part.");
  }
  if (!title) return bad("Title is required.");
  const description = nullableText(input.description);
  if (!description.valid) return bad("Description must be text.");
  if ("published" in input && typeof input.published !== "boolean") {
    return bad("Published must be true or false.");
  }
  return {
    ok: true as const,
    data: {
      bookId,
      parentType: input.parentType as "BOOK" | "PART",
      parentId,
      title,
      description: description.value,
      published: input.published === true,
    },
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  if (value === undefined || value === null) {
    return { valid: true, value: null as string | null };
  }
  if (typeof value !== "string") {
    return { valid: false, value: null as string | null };
  }
  return { valid: true, value: value.trim() || null };
}

function bad(message: string) {
  return {
    ok: false as const,
    response: NextResponse.json({ message }, { status: 400 }),
  };
}
