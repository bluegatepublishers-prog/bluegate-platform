import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type ContentStudioE2EFixture = { bookId: string; moduleId: string; publisherId: string; imageResourceIds: string[] };

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const productionLike = !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(baseURL);

test.skip(
  process.env.E2E_FIXTURE_LAYOUT !== "V2" || process.env.E2E_DISPOSABLE_FIXTURE !== "true",
  "V2 E2E is opt-in; set E2E_FIXTURE_LAYOUT=V2 and E2E_DISPOSABLE_FIXTURE=true.",
);
test.skip(
  productionLike && process.env.E2E_ALLOW_PRODUCTION_MUTATION !== "true",
  "Production-like mutation is disabled for disposable fixture tests.",
);
test.skip(
  !adminEmail || !adminPassword,
  "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.",
);

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }, testInfo) => {
  const fixture = await resetFixture(testInfo);
  const monitor = monitorPage(page);
  testInfo.attachments.push({ name: "fixture", body: Buffer.from(JSON.stringify(fixture, null, 2)), contentType: "application/json" });
  testInfo.annotations.push({ type: "fixture", description: fixture.moduleId });

  const modulePath = `/admin/books/${fixture.bookId}/content?selected=${encodeURIComponent(`MODULE:${fixture.moduleId}`)}`;
  await page.goto(`/admin/login?callbackUrl=${encodeURIComponent(modulePath)}`);
  if (/\/admin\/login(?:\?|$)/.test(page.url())) {
    await page.getByLabel("Email").fill(adminEmail!);
    await page.getByLabel("Password").fill(adminPassword!);
    await page.getByRole("button", { name: "Sign In" }).click();
  }

  await expect(page.getByTestId("content-studio-editor")).toBeVisible();
  await expect(page.getByText("Page Layout V2", { exact: true })).toBeVisible();
  const pageState = page as Page & { __contentStudioMonitor?: ReturnType<typeof monitorPage>; __contentStudioFixture?: ContentStudioE2EFixture };
  pageState.__contentStudioMonitor = monitor;
  pageState.__contentStudioFixture = fixture;
});

test.afterEach(async ({ page }, testInfo) => {
  await (page as Page & { __contentStudioMonitor?: ReturnType<typeof monitorPage> }).__contentStudioMonitor?.assertClean(testInfo);
});

test("page and frame move/resize persist after save and reload", async ({ page }) => {
  const frame = await addFrame(page, "Text");
  const frameId = await frame.getAttribute("data-v2-frame-id");
  expect(frameId).toBeTruthy();
  const beforeMove = await geometry(frame);

  await dragHandle(frame.getByRole("button", { name: "Move frame" }), 70, 45);
  const afterMove = await geometry(frame);
  expect(afterMove.left).not.toBe(beforeMove.left);
  expect(afterMove.top).not.toBe(beforeMove.top);

  await dragHandle(frame.getByRole("button", { name: "Resize frame" }), 80, 35);
  const afterResize = await geometry(frame);
  expect(afterResize.width).not.toBe(beforeMove.width);

  await saveAndWait(page);
  await page.reload();
  const reloaded = page.locator(`[data-v2-frame-id="${frameId}"]`);
  await expect(reloaded).toBeVisible();
  const persisted = await geometry(reloaded);
  expect(persisted.left).toBe(afterMove.left);
  expect(persisted.top).toBe(afterMove.top);
  expect(persisted.width).toBe(afterResize.width);
});

test("image FIT/FILL/CROP with pan and zoom persists when storage fixtures are enabled", async ({ page }, testInfo) => {
  const fixture = (page as Page & { __contentStudioFixture?: ContentStudioE2EFixture }).__contentStudioFixture;
  expect(fixture).toBeDefined();
  testInfo.skip(!fixture?.imageResourceIds.length, "Set E2E_STORAGE_ENABLED=true with disposable R2 credentials for protected image fixtures.");

  const frame = await addFrame(page, "Image");
  await frame.click();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await page.getByRole("button", { name: "Fill", exact: true }).click();
  await page.getByRole("button", { name: "Crop", exact: true }).click();
  await expect(page.getByText(/Crop mode/)).toBeVisible();
  await page.getByRole("button", { name: "Zoom image in" }).click();
  const viewport = frame.locator('[tabindex="0"]');
  await expect(viewport).toBeVisible();
  const image = frame.locator("img");
  const beforePan = await image.getAttribute("style");
  await dragHandle(viewport, 28, 18);
  const afterPan = await image.getAttribute("style");
  expect(afterPan).not.toBe(beforePan);

  await saveAndWait(page);
  await page.reload();
  const reloaded = page.locator(`[data-v2-frame-id="${await frame.getAttribute("data-v2-frame-id")}"]`);
  await reloaded.click();
  await expect(page.getByText(/1\.25/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Crop", exact: true })).toHaveClass(/bg-amber-200/);
});

test("text edit and wrapped-image movement persist", async ({ page }) => {
  const textFrame = await addFrame(page, "Text");
  const textbox = textFrame.getByRole("textbox", { name: "V2 text frame" });
  await textbox.fill("A long textbook paragraph that should reflow around a floating illustration while the author edits the manuscript.");
  const imageFrame = await addFrame(page, "Image");
  await imageFrame.click();
  await page.getByLabel("Object flow").selectOption("FLOAT");
  await page.getByLabel("Text wrap").selectOption("WRAP_BOTH");
  const line = textFrame.locator("span.block").first();
  const beforeWrap = await line.getAttribute("style");

  await dragHandle(imageFrame.getByRole("button", { name: "Move frame" }), 120, 40);
  await expect.poll(() => line.getAttribute("style")).not.toBe(beforeWrap);

  await saveAndWait(page);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "V2 text frame" })).toContainText("A long textbook paragraph");
  const reloadedImage = page.locator('[role="group"][aria-label="IMAGE frame"]').last();
  await reloadedImage.click();
  await expect(page.getByLabel("Text wrap")).toHaveValue("WRAP_BOTH");
});

test("educational container and child movement persist after save/reload", async ({ page }) => {
  const container = await addFrame(page, "Educational");
  const containerId = await container.getAttribute("data-v2-frame-id");
  expect(containerId).toBeTruthy();

  await page.getByRole("button", { name: "+ Text", exact: true }).click();
  const childText = page.locator('[role="group"][aria-label="TEXT frame"]').last();
  const childTextId = await childText.getAttribute("data-v2-frame-id");
  await page.getByRole("button", { name: "EDUCATIONAL", exact: true }).last().click();
  await page.getByRole("button", { name: "+ Image", exact: true }).click();
  const childImage = container.locator('[role="group"][aria-label="IMAGE frame"]').last();
  const childImageId = await childImage.getAttribute("data-v2-frame-id");

  await page.getByRole("button", { name: "EDUCATIONAL", exact: true }).last().click();
  await dragHandle(container.getByRole("button", { name: "Move frame" }), 60, 35);
  const parentAfterMove = await geometry(container);

  await childText.click();
  await dragHandle(childText.getByRole("button", { name: "Move frame" }), 24, 18);
  await saveAndWait(page);
  await page.reload();

  await expect(page.locator(`[data-v2-frame-id="${containerId}"]`)).toBeVisible();
  await expect(page.locator(`[data-v2-frame-id="${childTextId}"]`)).toBeVisible();
  await expect(page.locator(`[data-v2-frame-id="${childImageId}"]`)).toBeVisible();
  expect(await geometry(page.locator(`[data-v2-frame-id="${containerId}"]`))).toEqual(parentAfterMove);
});

test("background image layer and text-over-image ordering persist", async ({ page }) => {
  const imageFrame = await addFrame(page, "Image");
  const imageId = await imageFrame.getAttribute("data-v2-frame-id");
  await imageFrame.click();
  await page.getByLabel("Frame layer").selectOption("BACKGROUND");

  const textFrame = await addFrame(page, "Text");
  const textId = await textFrame.getAttribute("data-v2-frame-id");
  await page.getByRole("button", { name: "Bring to Front", exact: true }).click();
  await saveAndWait(page);
  await page.reload();

  const navigator = page.locator("[data-v2-object-navigator]");
  await navigator.getByRole("button", { name: "IMAGE", exact: true }).click();
  await expect(page.getByLabel("Frame layer")).toHaveValue("BACKGROUND");
  await navigator.getByRole("button", { name: "TEXT", exact: true }).click();
  await expect(page.getByLabel("Frame layer")).toHaveValue("CONTENT");
  await expect(page.locator(`[data-v2-frame-id="${imageId}"]`)).toBeVisible();
  await expect(page.locator(`[data-v2-frame-id="${textId}"]`)).toBeVisible();
});


async function resetFixture(testInfo: TestInfo) {
  try {
    process.env.E2E_DISPOSABLE_FIXTURE = "true";
    const result = await execFileAsync("npx.cmd", ["tsx", "scripts/setup-content-studio-e2e.ts"], { cwd: process.cwd(), env: process.env, maxBuffer: 1024 * 1024 });
    return JSON.parse(result.stdout) as ContentStudioE2EFixture;
  } catch (error) {
    testInfo.skip(true, `Disposable fixture setup unavailable: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function addFrame(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const type = label.toUpperCase();
  const frame = page.locator(`[role="group"][aria-label="${type} frame"]`).last();
  await expect(frame).toBeVisible();
  return frame;
}

async function dragHandle(handle: Locator, dx: number, dy: number) {
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  await handle.page().mouse.move(x, y);
  await handle.page().mouse.down();
  await handle.page().mouse.move(x + dx, y + dy, { steps: 6 });
  await handle.page().mouse.up();
}

async function geometry(frame: Locator) {
  return frame.evaluate((element) => {
    const style = element.getAttribute("style") ?? "";
    const get = (property: string) => style.match(new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+)`))?.[1] ?? "";
    return { left: get("left"), top: get("top"), width: get("width"), height: get("height") };
  });
}

async function saveAndWait(page: Page) {
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("v2-save-state")).toHaveText(/Saved/);
}

function monitorPage(page: Page) {
  const errors: string[] = [];
  const pending: Promise<void>[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !/favicon|webpack-hmr|hot-reloader|React DevTools/i.test(message.text())) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => {
    if (importantRequest(request.url(), request.method())) errors.push(`REQUEST FAILED ${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "unknown"}`);
  });
  page.on("response", (response) => {
    if (response.status() < 400 || !importantRequest(response.url(), response.request().method())) return;
    pending.push(response.text().then((body) => { errors.push(`HTTP ${response.status()} ${response.request().method()} ${response.url()} — ${body.slice(0, 240)}`); }).catch(() => undefined));
  });
  return {
    async assertClean(testInfo: TestInfo) {
      await Promise.all(pending);
      if (errors.length) await testInfo.attach("browser-failures", { body: errors.join("\n"), contentType: "text/plain" });
      expect(errors, "Unexpected browser console/network failures").toEqual([]);
    },
  };
}

function importantRequest(url: string, method: string) {
  return method !== "GET" || /\/api\/(admin\/resources|auth)/i.test(url);
}
