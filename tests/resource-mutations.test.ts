import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeAndCreateResourceBookmark,
  authorizeAndRecordResourceDownload,
  authorizeAndRemoveResourceBookmark,
  type ResourceMutationDependencies,
} from "../lib/resource-mutation-policy";

const teacherId = "teacher-a";
const userId = "teacher-user-a";
const resourceId = "resource-a";
const protectedUrl = "https://files.invalid/protected/resource.pdf";

function mutationDependencies(input: {
  authorized: boolean;
  existingBookmark?: boolean;
}) {
  const events: string[] = [];
  let downloadCount = 0;
  let bookmarkCreateCount = 0;
  let bookmarkDeleteCount = 0;
  const bookmark = {
    id: "bookmark-a",
    teacherId,
    resourceId,
    createdAt: new Date(0),
  };
  const dependencies = {
    async authorizeTeacherResource() {
      events.push("authorize");
      return input.authorized
        ? {
            teacher: { id: teacherId },
            resource: { id: resourceId, fileUrl: protectedUrl },
          }
        : null;
    },
    async findBookmark() {
      events.push("find-bookmark");
      return input.existingBookmark ? bookmark : null;
    },
    async createBookmark() {
      events.push("create-bookmark");
      bookmarkCreateCount += 1;
      return bookmark;
    },
    async deleteBookmarks() {
      events.push("delete-bookmark");
      bookmarkDeleteCount += 1;
      return 1;
    },
    async recordDownload() {
      events.push("record-download");
      downloadCount += 1;
    },
  } satisfies ResourceMutationDependencies;
  return {
    dependencies,
    events,
    counts: () => ({ downloadCount, bookmarkCreateCount, bookmarkDeleteCount }),
  };
}

test("authorized resource can be bookmarked after authorization", async () => {
  const fixture = mutationDependencies({ authorized: true });
  const result = await authorizeAndCreateResourceBookmark(
    userId,
    resourceId,
    fixture.dependencies,
  );
  assert.equal(result?.id, "bookmark-a");
  assert.deepEqual(fixture.events, ["authorize", "find-bookmark", "create-bookmark"]);
  assert.equal(fixture.counts().bookmarkCreateCount, 1);
});

test("repeated bookmark creation returns the existing bookmark", async () => {
  const fixture = mutationDependencies({ authorized: true, existingBookmark: true });
  const result = await authorizeAndCreateResourceBookmark(
    userId,
    resourceId,
    fixture.dependencies,
  );
  assert.equal(result?.id, "bookmark-a");
  assert.deepEqual(fixture.events, ["authorize", "find-bookmark"]);
  assert.equal(fixture.counts().bookmarkCreateCount, 0);
});

test("unauthorized or cross-publisher resource cannot be bookmarked", async () => {
  const fixture = mutationDependencies({ authorized: false });
  assert.equal(
    await authorizeAndCreateResourceBookmark(
      userId,
      "publisher-b-resource",
      fixture.dependencies,
    ),
    null,
  );
  assert.deepEqual(fixture.events, ["authorize"]);
  assert.equal(fixture.counts().bookmarkCreateCount, 0);
});

test("bookmark removal repeats authorization before ownership mutation", async () => {
  const fixture = mutationDependencies({ authorized: true });
  assert.deepEqual(
    await authorizeAndRemoveResourceBookmark(
      userId,
      resourceId,
      fixture.dependencies,
    ),
    { success: true },
  );
  assert.deepEqual(fixture.events, ["authorize", "delete-bookmark"]);
  assert.equal(fixture.counts().bookmarkDeleteCount, 1);
});

test("unauthorized bookmark removal performs no deletion", async () => {
  const fixture = mutationDependencies({ authorized: false });
  assert.equal(
    await authorizeAndRemoveResourceBookmark(
      userId,
      resourceId,
      fixture.dependencies,
    ),
    null,
  );
  assert.deepEqual(fixture.events, ["authorize"]);
  assert.equal(fixture.counts().bookmarkDeleteCount, 0);
});

test("download authorizes, records exactly once, then returns the file URL", async () => {
  const fixture = mutationDependencies({ authorized: true });
  const result = await authorizeAndRecordResourceDownload(
    userId,
    resourceId,
    fixture.dependencies,
  );
  assert.deepEqual(result, { url: protectedUrl });
  assert.deepEqual(fixture.events, ["authorize", "record-download"]);
  assert.equal(fixture.counts().downloadCount, 1);
});

for (const reason of [
  "authorization failure",
  "cross-publisher resource",
  "RESOURCES feature disabled",
]) {
  test(`${reason} creates no Download and reveals no URL`, async () => {
    const fixture = mutationDependencies({ authorized: false });
    const result = await authorizeAndRecordResourceDownload(
      userId,
      resourceId,
      fixture.dependencies,
    );
    assert.equal(result, null);
    assert.deepEqual(fixture.events, ["authorize"]);
    assert.equal(fixture.counts().downloadCount, 0);
    assert.equal(JSON.stringify(result).includes(protectedUrl), false);
  });
}

test("repeated downloads follow current append-only history behavior", async () => {
  const fixture = mutationDependencies({ authorized: true });
  await authorizeAndRecordResourceDownload(userId, resourceId, fixture.dependencies);
  await authorizeAndRecordResourceDownload(userId, resourceId, fixture.dependencies);
  assert.equal(fixture.counts().downloadCount, 2);
});
