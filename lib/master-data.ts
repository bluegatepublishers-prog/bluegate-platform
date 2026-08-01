import "server-only";

import { Prisma, SecurityAuditOutcome } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publisherAdminAuditActor, writeSecurityAuditEvent } from "@/lib/security-audit";
import type { SecurityAuditAction, SecurityAuditTargetType } from "@/lib/security-audit-policy";
import { boardInputSchema, masterDataDefinitionInputSchema, masterDataValueInputSchema } from "@/lib/master-data-policy";

export class MasterDataError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409) {
    super(message);
  }
}

type Actor = { userId: string; publisherId: string };
type Kind = "board" | "definition" | "value";

function schemaFor(kind: Kind) {
  return kind === "board" ? boardInputSchema : kind === "definition" ? masterDataDefinitionInputSchema : masterDataValueInputSchema;
}

function parseInput(kind: Kind, input: unknown) {
  const result = schemaFor(kind).safeParse(input);
  if (!result.success) throw new MasterDataError(result.error.issues[0]?.message ?? "Invalid master data.", 400);
  return { ...result.data, description: result.data.description || null };
}

function duplicateError(kind: Kind) {
  return new MasterDataError(`A ${kind === "definition" ? "master data type" : kind} with this name or code already exists.`, 409);
}

function translatePrismaError(error: unknown, kind: Kind): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw duplicateError(kind);
  throw error;
}

function lifecycleAction(prefix: "publisher.board" | "publisher.master_data_definition" | "publisher.master_data_value", before: boolean, after: boolean): SecurityAuditAction {
  if (before !== after) return `${prefix}.${after ? "activate" : "deactivate"}` as SecurityAuditAction;
  return `${prefix}.update` as SecurityAuditAction;
}

async function audit(tx: Prisma.TransactionClient, actor: Actor, action: SecurityAuditAction, targetType: SecurityAuditTargetType, targetId: string) {
  await writeSecurityAuditEvent(tx, {
    actor: publisherAdminAuditActor(actor), action, targetType, targetId,
    outcome: SecurityAuditOutcome.SUCCESS, metadata: { changedFields: ["masterData"] },
  });
}

export function listBoards(publisherId: string) {
  return prisma.board.findMany({ where: { publisherId }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
}

export async function createBoard(actor: Actor, input: unknown) {
  const data = parseInput("board", input);
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.board.create({ data: { ...data, publisherId: actor.publisherId } });
      await audit(tx, actor, "publisher.board.create", "Board", row.id);
      return row;
    });
  } catch (error) { translatePrismaError(error, "board"); }
}

export async function updateBoard(actor: Actor, id: string, input: unknown) {
  const data = parseInput("board", input);
  const current = await prisma.board.findFirst({ where: { id, publisherId: actor.publisherId } });
  if (!current) throw new MasterDataError("Board not found.", 404);
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.board.update({ where: { id }, data });
      await audit(tx, actor, lifecycleAction("publisher.board", current.active, row.active), "Board", id);
      return row;
    });
  } catch (error) { translatePrismaError(error, "board"); }
}

export function listDefinitions(publisherId: string) {
  return prisma.masterDataDefinition.findMany({ where: { publisherId }, include: { _count: { select: { values: true } } }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
}

export function getDefinition(publisherId: string, id: string) {
  return prisma.masterDataDefinition.findFirst({ where: { id, publisherId } });
}

export async function createDefinition(actor: Actor, input: unknown) {
  const data = parseInput("definition", input);
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.masterDataDefinition.create({ data: { ...data, publisherId: actor.publisherId } });
      await audit(tx, actor, "publisher.master_data_definition.create", "MasterDataDefinition", row.id);
      return row;
    });
  } catch (error) { translatePrismaError(error, "definition"); }
}

export async function updateDefinition(actor: Actor, id: string, input: unknown) {
  const data = parseInput("definition", input);
  const current = await getDefinition(actor.publisherId, id);
  if (!current) throw new MasterDataError("Master data type not found.", 404);
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.masterDataDefinition.update({ where: { id }, data });
      await audit(tx, actor, lifecycleAction("publisher.master_data_definition", current.active, row.active), "MasterDataDefinition", id);
      return row;
    });
  } catch (error) { translatePrismaError(error, "definition"); }
}

export function listValues(publisherId: string, definitionId: string) {
  return prisma.masterDataValue.findMany({ where: { publisherId, definitionId }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
}

async function requireOwnedDefinition(publisherId: string, definitionId: string) {
  const definition = await getDefinition(publisherId, definitionId);
  if (!definition) throw new MasterDataError("Master data type not found.", 404);
  return definition;
}

export async function createValue(actor: Actor, definitionId: string, input: unknown) {
  await requireOwnedDefinition(actor.publisherId, definitionId);
  const data = parseInput("value", input);
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.masterDataValue.create({ data: { ...data, definitionId, publisherId: actor.publisherId } });
      await audit(tx, actor, "publisher.master_data_value.create", "MasterDataValue", row.id);
      return row;
    });
  } catch (error) { translatePrismaError(error, "value"); }
}

export async function updateValue(actor: Actor, definitionId: string, id: string, input: unknown) {
  await requireOwnedDefinition(actor.publisherId, definitionId);
  const data = parseInput("value", input);
  const current = await prisma.masterDataValue.findFirst({ where: { id, definitionId, publisherId: actor.publisherId } });
  if (!current) throw new MasterDataError("Master data value not found.", 404);
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.masterDataValue.update({ where: { id }, data });
      await audit(tx, actor, lifecycleAction("publisher.master_data_value", current.active, row.active), "MasterDataValue", id);
      return row;
    });
  } catch (error) { translatePrismaError(error, "value"); }
}
