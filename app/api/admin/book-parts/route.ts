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

      const [order, slug] = await Promise.all([
        tx.bookPart.aggregate({
          where: { bookId: book.id },
          _max: { displayOrder: true },
        }),
        uniqueSlug(tx, book.id, parsed.data.title),
      ]);
      const node = await tx.bookPart.create({
        data: {
          bookId: book.id,
          title: parsed.data.title,
          slug,
          description: parsed.data.description,
          published: parsed.data.published,
          publishedAt: parsed.data.published ? new Date() : null,
          displayOrder: (order._max.displayOrder ?? -1) + 1,
        },
      });
      await writeSecurityAuditEvent(tx, {
        actor: publisherAdminAuditActor(access.actor),
        action: "publisher.book_part.create",
        targetType: "BookPart",
        targetId: node.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: {
          changedFields: [
            "bookId",
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
  if (!bookId || input.parentType !== "BOOK" || parentId !== bookId) {
    return bad("A Part must belong directly to a valid Book.");
  }
  if (!title) return bad("Title is required.");
  const description = nullableText(input.description);
  if (!description.valid) return bad("Description must be text.");
  if (
    "published" in input &&
    typeof input.published !== "boolean"
  ) {
    return bad("Published must be true or false.");
  }
  return {
    ok: true as const,
    data: {
      bookId,
      title,
      description: description.value,
      published: input.published === true,
    },
  };
}

async function uniqueSlug(
  tx: Prisma.TransactionClient,
  bookId: string,
  title: string,
) {
  const base =
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "part";
  let slug = base;
  let suffix = 2;
  while (
    await tx.bookPart.findFirst({
      where: { bookId, slug },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
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
