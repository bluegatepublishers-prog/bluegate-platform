import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  boardInputSchema,
  masterDataDefinitionInputSchema,
  masterDataValueInputSchema,
  normalizeMasterDataCode,
} from "../lib/master-data-policy";
import { createEmptyBookFormData, parseBookFormData } from "../lib/book-form-data";

const read = (path: string) => readFileSync(path, "utf8");
const schema = read("prisma/schema.prisma");
const service = read("lib/master-data.ts");
const boardApi = read("app/api/admin/master/boards/route.ts");
const valueApi = read("app/api/admin/master/custom/[definitionId]/values/[valueId]/route.ts");

test("board input normalizes codes and validates order", () => {
  const parsed = boardInputSchema.parse({ name: "Central Board", code: " central-board ", displayOrder: 2, active: true });
  assert.equal(parsed.code, "CENTRAL_BOARD");
  assert.throws(() => boardInputSchema.parse({ name: "Board", code: "board", displayOrder: -1, active: true }));
  assert.equal(normalizeMasterDataCode(" state  board "), "STATE_BOARD");
});

test("publisher compound constraints permit the same code in different publishers and reject duplicates within one", () => {
  assert.match(schema, /@@unique\(\[publisherId, code\]\)/);
  assert.match(service, /P2002/);
  assert.match(service, /publisherId: actor\.publisherId/);
});

test("board reads and mutations derive tenant scope from the trusted actor", () => {
  assert.match(boardApi, /authorizePublisherAdminApi/);
  assert.match(boardApi, /publisherId: access\.actor\.publisherId/);
  assert.doesNotMatch(boardApi, /input\.publisherId|body\.publisherId/);
  assert.match(boardApi, /OR: \[\{ active: true \}/);
});

test("inactive existing board compatibility and legacy null relation are retained", () => {
  const empty = createEmptyBookFormData();
  assert.equal(empty.boardId, "");
  const legacy = parseBookFormData({ title: "Legacy", board: "CBSE", boardId: null });
  assert.equal(legacy.board, "CBSE");
  assert.equal(legacy.boardId, "");
  assert.match(boardApi, /includeId/);
});

test("reserved core codes cannot be shadowed by custom definitions", () => {
  assert.equal(masterDataDefinitionInputSchema.safeParse({ name: "Fake board", code: "board", active: true }).success, false);
  assert.equal(masterDataDefinitionInputSchema.safeParse({ name: "Regions", code: "school regions", active: true }).success, true);
});

test("custom values validate and remain scoped to publisher and definition", () => {
  assert.equal(masterDataValueInputSchema.safeParse({ name: "North", code: "north", active: true }).success, true);
  assert.match(valueApi, /definitionId, publisherId: access\.actor\.publisherId/);
  assert.match(service, /where: \{ id, definitionId, publisherId: actor\.publisherId \}/);
});

test("Board and generic lifecycle mutations are audited and expose no hard-delete route", () => {
  assert.match(service, /publisher\.board\.create/);
  assert.match(service, /publisher\.master_data_definition\.create/);
  assert.match(service, /publisher\.master_data_value\.create/);
  assert.doesNotMatch(boardApi, /export async function DELETE/);
});
