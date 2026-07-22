import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync("components/layout/Header.tsx", "utf8");
const topBar = readFileSync("components/layout/TopBar.tsx", "utf8");

test("public login dropdown lists role logins in the required order", () => {
  const labels = [
    "Teacher Login",
    "School Login",
    "Student Login",
    "Parent Login",
    "Mentor Login",
  ];
  let previous = -1;
  for (const label of labels) {
    const index = header.indexOf(label);
    assert.ok(index > previous, `${label} must appear in order`);
    previous = index;
  }
  assert.match(header, /href: "\/student-login"/);
  assert.doesNotMatch(header, /Admin Login|Super Admin Login/);
  assert.doesNotMatch(topBar, /Teacher Login|School Login|Student Login/);
});

test("desktop and mobile login controls preserve accessible behavior", () => {
  assert.match(header, /aria-expanded=\{loginOpen\}/);
  assert.match(header, /aria-controls="public-login-menu"/);
  assert.match(header, /aria-controls="public-mobile-login-menu"/);
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /closeOnOutsideClick/);
  assert.match(header, /setMobileOpen\(false\)/);
  assert.match(header, /focus-visible:ring-2/);
});
