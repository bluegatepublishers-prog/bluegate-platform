import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createV2PageLayout, normalizePageLayoutV2 } from "../lib/content-layout-v2";
import {
  createV2WorksheetLauncherPayload,
  getV2WorksheetLauncherPayload,
} from "../lib/v2-worksheet-launcher";

const read = (path: string) => readFileSync(path, "utf8");

test("worksheet launcher payload is explicit, compact, and survives V2 normalization", () => {
  const payload = createV2WorksheetLauncherPayload(" worksheet-1 ");
  assert.deepEqual(payload, {
    kind: "WORKSHEET_LAUNCHER",
    version: 1,
    worksheetId: "worksheet-1",
    display: { label: "WORKSHEET" },
  });
  assert.doesNotMatch(JSON.stringify(payload), /question|answer|correct/i);

  const layout = createV2PageLayout({
    pages: [{
      id: "page-1",
      frames: [{
        id: "frame-1",
        pageId: "page-1",
        type: "WORKSHEET",
        x: 12,
        y: 12,
        width: 160,
        height: 48,
        payload,
      }],
    }],
  });
  const frame = normalizePageLayoutV2(JSON.parse(JSON.stringify(layout)))?.pages[0]?.frames[0];
  assert.deepEqual(getV2WorksheetLauncherPayload(frame!), payload);
});

test("legacy WORKSHEET frame payloads stay out of the launcher path", () => {
  const legacy = {
    type: "WORKSHEET" as const,
    payload: { title: "Static worksheet block", blocks: ["legacy"] },
  };
  assert.equal(getV2WorksheetLauncherPayload(legacy), null);

  const content = read("components/content/v2/V2FrameContent.tsx");
  assert.match(content, /getV2WorksheetLauncherPayload\(frame\)/);
  assert.match(content, /\["EDUCATIONAL", "ACTIVITY", "WORKSHEET", "EXERCISE"\]/);
  assert.ok(content.indexOf("getV2WorksheetLauncherPayload(frame)") < content.indexOf('["EDUCATIONAL", "ACTIVITY", "WORKSHEET", "EXERCISE"]'));
});

test("publisher picker limits worksheet launchers to eligible student worksheets", () => {
  const picker = read("components/admin/books/editor/V2WorksheetLauncherAuthoring.tsx");
  const route = read("app/api/admin/books/[bookId]/worksheet-launcher/route.ts");
  for (const fragment of [
    "active: true",
    "published: true",
    "archivedAt: null",
    "allowOnlineAttempt: true",
    'audience: { in: ["STUDENT", "BOTH"] }',
    "where: { id: chapterId, bookId: book.id }",
    "...(chapterId ? { chapterId } : {})",
    "...(moduleId ? { moduleId } : {})",
  ]) assert.match(route, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(picker, /questionCount/);
  assert.match(picker, /totalMarks/);
});

test("authoring, preview, and student delivery stay separated", () => {
  const workspace = read("components/admin/books/editor/V2DocumentWorkspace.tsx");
  const visual = read("components/content/v2/V2WorksheetLauncherVisual.tsx");
  const overlay = read("components/content/v2/V2WorksheetLauncherOverlay.tsx");
  assert.match(workspace, /openInsertSurface\("WORKSHEET"\)/);
  assert.match(workspace, /createV2WorksheetLauncherPayload/);
  assert.match(workspace, /assignments\/worksheets/);
  assert.match(visual, /data-v2-worksheet-launcher-admin-controls/);
  assert.match(visual, /Preview/);
  assert.match(visual, /Edit/);
  assert.match(workspace, /<V2WorksheetLauncherVisual[\s\S]*mode="PREVIEW"/);
  assert.match(overlay, /mode === "PREVIEW"/);
  assert.match(overlay, /\/api\/admin\/worksheets\//);
  assert.match(overlay, /mode === "PREVIEW"[\s\S]{0,180}\/api\/admin\/worksheets/);
  assert.match(overlay, /\/api\/student\/worksheets\/launcher/);
  assert.match(overlay, /for \(const question of questions\)/);
  assert.match(overlay, /\/response/);
  assert.match(overlay, /\/submit/);
});

test("student result feedback comes only from the worksheet service after one submit", () => {
  const service = read("lib/student-worksheet.ts");
  const overlay = read("components/content/v2/V2WorksheetLauncherOverlay.tsx");
  const policy = read("lib/student-worksheet-policy.ts");
  assert.match(service, /orderBy: \{ position: "asc" \}/);
  assert.match(service, /showAnswersAfterSubmit/);
  assert.match(service, /feedbackAllowed/);
  assert.match(overlay, /Worksheet submitted/);
  assert.match(overlay, /showAnswersAfterSubmit === true/);
  assert.match(overlay, /Response recorded/);
  assert.match(policy, /MANUAL_RESPONSE/);
  assert.match(policy, /correct: response\.correct/);
});
