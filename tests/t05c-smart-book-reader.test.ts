import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildSmartBookContents } from "../lib/smart-book-contents";

const read = (path: string) => readFileSync(path, "utf8");

test("T-05C teacher library is assignment/entitlement derived and deduplicated", () => {
  const source = read("lib/teacher-books.ts");
  assert.match(source, /getTeacherEntitledBookIds/);
  assert.match(source, /getBookEntitlementForAuthenticatedUser/);
  assert.match(source, /new Map<string/);
  assert.match(source, /published: true/);
  assert.match(source, /schoolEntitlements/);
});

test("T-05C student library and reader remain directly authorized", () => {
  const source = read("lib/student-books.ts");
  const route = read("app/student-dashboard/books/[bookId]/page.tsx");
  assert.match(source, /getStudentSubjects/);
  assert.match(source, /getBookEntitlementForAuthenticatedUser/);
  assert.match(route, /getStudentBook\(bookId\)/);
  assert.match(route, /notFound\(\)/);
});

test("T-05C contents uses actual levels without inventing absent hierarchy", () => {
  const nodes = buildSmartBookContents({
    parts: [],
    units: [{ id: "unit", partId: null, title: "Unit 1", startPage: 3, displayOrder: 1, published: true, archived: false }],
    chapters: [{ id: "chapter", partId: null, unitId: "unit", chapterNumber: 1, title: "Chapter 1", startPage: 4, displayOrder: 1, published: true, archived: false }],
    modules: [{ id: "module", chapterId: "chapter", title: "Module 1", startPage: 5, displayOrder: 1, published: true, archived: false }],
    topics: [{ id: "topic", chapterId: "chapter", moduleId: "module", title: "Topic 1", startPage: null, displayOrder: 1, published: true, archived: false }],
    exercises: [{ id: "exercise", chapterId: "chapter", moduleId: "module", topicId: "topic", title: "Practice", startPage: 8, displayOrder: 1, published: true, archived: false }],
  });
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0]?.kind, "UNIT");
  assert.equal(nodes[0]?.children[0]?.kind, "CHAPTER");
  assert.equal(nodes[0]?.children[0]?.children[0]?.kind, "MODULE");
  assert.equal(nodes[0]?.children[0]?.children[0]?.children[0]?.kind, "TOPIC");
  assert.equal(nodes[0]?.children[0]?.children[0]?.children[0]?.children[0]?.startPage, 8);
  assert.equal(nodes.some((item) => item.kind === "PART"), false);
});

test("T-05C contents is flush-left and uses semantic level styling", () => {
  const source = read("components/books/SmartBookContentsPanel.tsx");
  assert.doesNotMatch(source, /(?:^|["' ])(?:ml|pl)-\d/);
  assert.match(source, /data-contents-level/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /rowStyle/);
  assert.match(source, /onClose/);
});

test("T-05C reader reuses SmartBookViewer and renders only the active V2 page", () => {
  const reader = read("components/books/SmartBookReader.tsx");
  const renderer = read("components/content/V2ContentDocumentRenderer.tsx");
  assert.match(reader, /SmartBookViewer/);
  assert.match(reader, /pageNumber=\{page\}/);
  assert.match(reader, /overlayOnly/);
  assert.match(renderer, /pageNumber\?: number/);
  assert.match(renderer, /layout\.pages\.filter/);
  assert.match(renderer, /overlayOnly/);
});

test("T-05C reader keeps Previous/Next clamped through the shared viewer", () => {
  const source = read("components/books/SmartBookViewer.tsx");
  assert.match(source, /disabled=\{page <= 1\}/);
  assert.match(source, /page >= totalPages/);
  assert.match(source, /clampPage/);
  assert.match(source, /minimalControls/);
});

test("T-05C teacher resources are metadata-first and protected by a teacher book URL", () => {
  const reader = read("components/books/SmartBookReader.tsx");
  const route = read("app/api/teacher/books/[bookId]/resources/[resourceId]/open/route.ts");
  const service = read("lib/teacher-books.ts");
  assert.match(reader, /role === "TEACHER"/);
  assert.doesNotMatch(reader, /objectKey/);
  assert.match(route, /getApiUser\(\["TEACHER"\]\)/);
  assert.match(route, /getTeacherBookResource/);
  assert.match(service, /published: true/);
  assert.match(route, /teacher-resource-pdf/);
});

test("T-05C student route does not include Teacher Resources", () => {
  const route = read("app/student-dashboard/books/[bookId]/page.tsx");
  assert.doesNotMatch(route, /teacherResources/);
  assert.doesNotMatch(route, /Teacher Resources/);
});

test("T-05C reader pages are read-only entry points", () => {
  const teacherRoute = read("app/teacher-dashboard/books/[bookId]/page.tsx");
  const reader = read("components/books/SmartBookReader.tsx");
  assert.doesNotMatch(teacherRoute, /startPage|endPage|mapping|Content Studio/);
  assert.doesNotMatch(reader, /save.*mapping|delete.*resource|assessment.*author/i);
});

test("T-05C teacher book, cover, and Auth.js route handlers remain registered", () => {
  const authRoute = read("app/api/auth/[...nextauth]/route.ts");
  const coverRoute = read("app/api/books/[bookId]/asset/[kind]/route.ts");
  const teacherRoute = read("app/teacher-dashboard/books/[bookId]/page.tsx");
  const logoutButton = read("components/dashboard/LogoutButton.tsx");

  assert.match(authRoute, /export const \{ GET, POST \} = handlers/);
  assert.match(coverRoute, /kind !== "cover" && kind !== "preview"/);
  assert.match(coverRoute, /getStorageProvider/);
  assert.match(teacherRoute, /getTeacherBook\(bookId\)/);
  assert.match(teacherRoute, /notFound\(\)/);
  assert.match(logoutButton, /callbackUrl: "\/teacher-login"/);
});
