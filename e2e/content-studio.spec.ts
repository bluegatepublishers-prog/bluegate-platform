import { expect, test, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const bookId = process.env.E2E_BOOK_ID;
const moduleId = process.env.E2E_MODULE_ID;
const fixturePrefix = process.env.E2E_FIXTURE_PREFIX ?? "[E2E]";
const imageFixture = path.resolve(
  process.env.E2E_IMAGE_FIXTURE ?? "tests/fixtures/content-studio/e2e-image.svg",
);
const videoFixture = process.env.E2E_VIDEO_FIXTURE
  ? path.resolve(process.env.E2E_VIDEO_FIXTURE)
  : null;

const modulePath = `/admin/books/${bookId ?? "missing-book"}/content?selected=${encodeURIComponent(`MODULE:${moduleId ?? "missing-module"}`)}`;
const isProductionLike = !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(baseURL);

const requiredEnvironment = [
  ["E2E_ADMIN_EMAIL", adminEmail],
  ["E2E_ADMIN_PASSWORD", adminPassword],
  ["E2E_BOOK_ID", bookId],
  ["E2E_MODULE_ID", moduleId],
] as const;

const missingEnvironment = requiredEnvironment
  .filter(([, value]) => !value)
  .map(([name]) => name);

test.skip(
  process.env.E2E_FIXTURE_LAYOUT === "V2",
  "Legacy Content Studio workflow is disabled when the disposable V2 fixture is selected.",
);
test.skip(
  missingEnvironment.length > 0,
  `Environment unavailable; set ${missingEnvironment.join(", ")}.`,
);
test.skip(
  isProductionLike && process.env.E2E_ALLOW_PRODUCTION_MUTATION !== "true",
  "Production-like mutation is disabled; set E2E_ALLOW_PRODUCTION_MUTATION=true only for a disposable fixture.",
);

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.skip(
    missingEnvironment.length > 0,
    `Environment unavailable; set ${missingEnvironment.join(", ")}.`,
  );
  testInfo.skip(
    isProductionLike && process.env.E2E_ALLOW_PRODUCTION_MUTATION !== "true",
    "Production-like mutation is disabled; set E2E_ALLOW_PRODUCTION_MUTATION=true only for a disposable fixture.",
  );

  await page.goto(`/admin/login?callbackUrl=${encodeURIComponent(modulePath)}`);
  if (/\/admin\/login(?:\?|$)/.test(page.url())) {
    await page.getByLabel("Email").fill(adminEmail!);
    await page.getByLabel("Password").fill(adminPassword!);
    await page.getByRole("button", { name: "Sign In" }).click();
  }
  await expect(page.getByTestId("content-studio-editor")).toBeVisible();
  await expect(page.locator(`[data-node-id="${moduleId}"]`)).toBeVisible();
});

test("opens the disposable Module and persists manuscript, table, canvas, and responsive changes", async ({ page }, testInfo) => {
  const monitor = monitorPage(page);
  const manuscript = `${fixturePrefix} Manuscript Test`;

  const firstText = page.locator("textarea[data-block-id], input[data-block-id]").first();
  await firstText.fill(manuscript);
  await page.getByTitle("Bold").click();

  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await page.getByTitle("Table").click();
  await page.getByLabel("Rows").fill("3");
  await page.getByLabel("Columns").fill("3");
  await page.getByRole("button", { name: "Insert", exact: true }).last().click();
  const visualCells = page.locator("td, th");
  await expect(visualCells).toHaveCount(9);
  await visualCells.nth(0).click();
  await page.getByRole("button", { name: "Properties", exact: true }).last().click();
  const cells = page.locator('[role="cell"], [role="columnheader"]');
  await expect(cells).toHaveCount(9);
  await cells.nth(0).fill(`${fixturePrefix}-A1`);
  await cells.nth(1).fill(`${fixturePrefix}-A2`);
  await cells.nth(2).fill(`${fixturePrefix}-A3`);
  await cells.nth(0).click();
  await page.locator("summary").filter({ hasText: "Cell" }).click();
  await page.getByRole("button", { name: /header/i }).last().click();
  await page.locator("summary").filter({ hasText: "Align" }).click();
  await page.getByLabel("Cell horizontal alignment").selectOption("center");
  await page.locator("summary").filter({ hasText: "Table" }).click();
  await page.getByRole("button", { name: "Add row below" }).click();
  await page.getByRole("button", { name: "Delete row" }).click();
  await page.getByRole("button", { name: "Save manuscript" }).click();
  await expect(page.locator('[data-content-editor-dirty="false"]')).toBeVisible();

  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await page.getByTitle("Educational Element").click();
  await page.getByRole("button", { name: "Do You Know?", exact: true }).click();
  await page.getByText("Do You Know?", { exact: true }).last().click();
  await page.getByRole("button", { name: "Properties", exact: true }).last().click();
  await page.getByPlaceholder("Write the educational prompt or explanation.").last().fill(`${fixturePrefix} educational object verification`);
  await page.getByRole("button", { name: "View", exact: true }).click();
  const canvas = page.locator('select:has(option[value="A4"])');
  for (const preset of ["A4", "A5", "A3", "CUSTOM", "WEB", "STUDENT", "TEACHER", "A4"]) {
    await canvas.selectOption(preset);
    await expect(page.getByText(manuscript, { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Save manuscript" }).click();
  await page.reload();
  await expect(page.getByText(manuscript, { exact: true })).toBeVisible();
  await expect(page.getByText(`${fixturePrefix}-A1`, { exact: true })).toBeVisible();
  await expect(page.getByText(`${fixturePrefix} educational object verification`, { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("content-studio-editor")).toBeVisible();
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 24);
  await monitor.assertClean(testInfo);
});

test("persists Activity, Worksheet, Exercise, and Student/Teacher visibility", async ({ page }, testInfo) => {
  const monitor = monitorPage(page);
  const activityTitle = `${fixturePrefix} Activity`;
  const teacherText = `${fixturePrefix} teacher-only content`;
  const worksheetPrompt = `${fixturePrefix} worksheet MCQ`;
  const exercisePrompt = `${fixturePrefix} exercise question`;

  await insertLearningObject(page, "Activity");
  await page.getByPlaceholder("Activity title (optional)").last().fill(activityTitle);
  await page.getByPlaceholder("Procedure / Instructions (optional)").last().fill(`${fixturePrefix} Verify Activity persistence`);
  await page.getByRole("button", { name: "+ Add field" }).last().click();
  await page.getByRole("button", { name: "Objective", exact: true }).click();
  await page.getByPlaceholder("Objective (optional)").last().fill(`${fixturePrefix} objective`);
  await page.getByRole("button", { name: "+ Add field" }).last().click();
  await page.getByRole("button", { name: "Teacher Note", exact: true }).click();
  await page.getByPlaceholder("Teacher Note (optional)").last().fill(teacherText);

  await insertLearningObject(page, "Worksheet");
  await page.getByPlaceholder("Worksheet title (optional)").last().fill(`${fixturePrefix} Worksheet`);
  await page.getByRole("button", { name: "+ Add Question", exact: true }).last().click();
  await page.getByRole("button", { name: "MCQ", exact: true }).last().click();
  await page.getByPlaceholder("Question prompt").last().fill(worksheetPrompt);
  await page.getByPlaceholder("Option A").last().fill(`${fixturePrefix} correct option`);
  await page.getByPlaceholder("Option B").last().fill(`${fixturePrefix} other option`);
  await page.locator("select:visible").last().selectOption({ index: 1 });
  await page.getByRole("button", { name: "+ Add Question", exact: true }).last().click();
  await page.getByRole("button", { name: "Short Answer", exact: true }).last().click();
  await page.getByPlaceholder("Question prompt").last().fill(`${fixturePrefix} worksheet short answer`);
  await page.getByRole("button", { name: "Answer and visibility (optional)" }).last().click();
  await page.getByPlaceholder("Suggested answer").last().fill(`${fixturePrefix} worksheet answer`);

  await insertLearningObject(page, "Exercise");
  await page.getByPlaceholder("Exercise title (optional)").last().fill(`${fixturePrefix} Exercise`);
  await page.getByRole("button", { name: "+ Add Question", exact: true }).last().click();
  await page.getByRole("button", { name: "Short Answer", exact: true }).last().click();
  await page.getByPlaceholder("Question prompt").last().fill(exercisePrompt);
  await page.getByRole("button", { name: "Answer and visibility (optional)" }).last().click();
  await page.getByPlaceholder("Suggested answer").last().fill(`${fixturePrefix} exercise answer`);
  await page.getByRole("button", { name: "+ Add Group", exact: true }).last().click();
  await page.getByPlaceholder("Group title (optional)").last().fill(`${fixturePrefix} Group`);
  await page.getByRole("button", { name: "+ Add Question", exact: true }).last().click();
  await page.getByRole("button", { name: "MCQ", exact: true }).last().click();
  await page.getByPlaceholder("Question prompt").last().fill(`${fixturePrefix} grouped question`);

  await page.getByRole("button", { name: "Save manuscript" }).click();
  await expect(page.locator('[data-content-editor-dirty="false"]')).toBeVisible();
  await page.reload();
  await expect(page.getByText(activityTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(worksheetPrompt, { exact: true })).toBeVisible();
  await expect(page.getByText(exercisePrompt, { exact: true })).toBeVisible();
  await expect(page.getByText(`${fixturePrefix} Group`, { exact: true })).toBeVisible();

  await previewAndAssert(page, "Student", [teacherText, `${fixturePrefix} worksheet answer`, `${fixturePrefix} exercise answer`], true);
  await previewAndAssert(page, "Teacher", [teacherText, `${fixturePrefix} worksheet answer`, `${fixturePrefix} exercise answer`], false);
  await monitor.assertClean(testInfo);
});

test("uploads and persists a real image Resource when storage is explicitly enabled", async ({ page }, testInfo) => {
  testInfo.skip(
    process.env.E2E_STORAGE_ENABLED !== "true",
    "SKIPPED — set E2E_STORAGE_ENABLED=true only when the disposable environment has storage credentials.",
  );
  const monitor = monitorPage(page);
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await page.getByTitle("Image").click();
  await page.getByLabel("Choose Image").setInputFiles(imageFixture);
  await page.getByLabel("Image Name").fill(`${fixturePrefix} image`);
  await page.getByRole("button", { name: "Upload and Insert" }).click();
  await expect(page.getByText("Inserted", { exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Save manuscript" }).click();
  await page.reload();
  await expect(page.locator('img[alt*="image" i]').last()).toBeVisible();
  await monitor.assertClean(testInfo);
});

test("uploads and persists a real video Resource when a small fixture is provided", async ({ page }, testInfo) => {
  testInfo.skip(
    process.env.E2E_STORAGE_ENABLED !== "true" || !videoFixture,
    "SKIPPED — set E2E_STORAGE_ENABLED=true and E2E_VIDEO_FIXTURE for the disposable environment.",
  );
  const monitor = monitorPage(page);
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await page.getByTitle("Video").click();
  await page.getByRole("heading", { name: "Insert Video" }).waitFor();
  await page.getByLabel("File").setInputFiles(videoFixture!);
  await page.getByLabel("Title").fill(`${fixturePrefix} video`);
  await page.getByRole("button", { name: "Upload and Insert" }).click();
  await expect(page.getByText("Inserted", { exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Save manuscript" }).click();
  await page.reload();
  await expect(page.locator("video").last()).toBeVisible();
  await monitor.assertClean(testInfo);
});

async function insertLearningObject(page: Page, label: "Activity" | "Worksheet" | "Exercise") {
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await page.getByTitle(label).click();
}

async function previewAndAssert(page: Page, label: "Student" | "Teacher", values: string[], student: boolean) {
  await page.getByRole("button", { name: "Preview" }).click();
  await page.getByRole("button", { name: label, exact: true }).click();
  const drawer = page.locator(`[data-builder-title="${label} Preview"]`);
  await expect(drawer).toBeVisible();
  for (const value of values) {
    if (student) await expect(drawer.getByText(value, { exact: true })).toHaveCount(0);
    else await expect(drawer.getByText(value, { exact: true })).toBeVisible();
  }
  await drawer.getByRole("button", { name: `Close ${label} Preview` }).click();
}

function monitorPage(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkFailures: Promise<void>[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !isBenignConsoleMessage(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (isImportantRequest(request.url(), request.method())) {
      networkFailures.push(Promise.resolve().then(() => {
        consoleErrors.push(`REQUEST FAILED ${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "unknown"}`);
      }));
    }
  });
  page.on("response", (response) => {
    if (response.status() < 400 || !isImportantRequest(response.url(), response.request().method())) return;
    networkFailures.push(response.text().then((body) => {
      const summary = body.replace(/\s+/g, " ").slice(0, 240);
      consoleErrors.push(`HTTP ${response.status()} ${response.request().method()} ${response.url()} — ${summary}`);
    }).catch(() => {
      consoleErrors.push(`HTTP ${response.status()} ${response.request().method()} ${response.url()}`);
    }));
  });
  return {
    async assertClean(testInfo: TestInfo) {
      await Promise.all(networkFailures);
      if (consoleErrors.length || pageErrors.length) {
        await testInfo.attach("browser-failures", { body: [...consoleErrors, ...pageErrors].join("\n"), contentType: "text/plain" });
      }
      expect(pageErrors, "Unexpected browser page errors").toEqual([]);
      expect(consoleErrors, "Unexpected console/network failures").toEqual([]);
    },
  };
}

function isImportantRequest(url: string, method: string) {
  return method !== "GET" || /\/api\/(storage\/upload|admin\/resources|auth)/i.test(url);
}

function isBenignConsoleMessage(message: string) {
  return /favicon|download the React DevTools|webpack-hmr|hot-reloader|hydration failed due to browser extensions/i.test(message);
}
