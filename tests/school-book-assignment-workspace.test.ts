import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const page = read("app/school-dashboard/books/page.tsx");
const workspace = read("components/school/SchoolBookAssignmentWorkspace.tsx");

test("School Books uses a class-first assignment workspace", () => {
  assert.match(page, /SchoolBookAssignmentWorkspace/);
  assert.match(page, /schoolEntitlements/);
  assert.match(page, /assignApprovedBook\.bind/);
  assert.match(workspace, /selectedClassId/);
  assert.match(workspace, /selectedSectionId/);
  assert.match(workspace, /Available entitled books/);
  assert.match(workspace, /item\.assignedBookId \? "Change" : "Assign"/);
  assert.doesNotMatch(workspace, /Save assignment/);
});
