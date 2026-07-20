import assert from "node:assert/strict";
import test from "node:test";

import { parseContactSubmission } from "../lib/contact-validation";
import { POST } from "../app/api/contact/route";

test("contact validation rejects malformed json", async () => {
  const request = new Request("https://example.com/api/contact", {
    method: "POST",
    body: "{",
  });

  const result = await parseContactSubmission(request);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.equal(result.message, "Malformed JSON body.");
  }
});

test("contact validation rejects missing required fields", async () => {
  const request = new Request("https://example.com/api/contact", {
    method: "POST",
    body: JSON.stringify({ email: "", message: "" }),
  });

  const result = await parseContactSubmission(request);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.equal(result.errors?.name, "Name is required and must be 100 characters or fewer.");
    assert.equal(result.errors?.email, "Enter a valid email address up to 254 characters.");
    assert.equal(result.errors?.message, "Message is required and must be 5,000 characters or fewer.");
  }
});

test("contact api returns service unavailable without email config", async () => {
  const originalUser = process.env.EMAIL_USER;
  const originalPass = process.env.EMAIL_PASS;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;

  try {
    const response = await POST(
      new Request("https://example.com/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Asha",
          email: "asha@example.com",
          subject: "General Enquiry",
          message: "Please send the catalogue.",
        }),
      }),
    );

    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.success, false);
  } finally {
    if (originalUser) process.env.EMAIL_USER = originalUser;
    else delete process.env.EMAIL_USER;
    if (originalPass) process.env.EMAIL_PASS = originalPass;
    else delete process.env.EMAIL_PASS;
  }
});
