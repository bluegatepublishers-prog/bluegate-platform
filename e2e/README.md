# Content Studio browser verification

This harness uses Playwright against a disposable Module selected through environment variables. It never creates, deletes, or resets hierarchy data, and it refuses production-like mutation unless `E2E_ALLOW_PRODUCTION_MUTATION=true` is explicitly set.

Required variables:

```powershell
$env:E2E_BASE_URL='http://localhost:3000'
$env:E2E_ADMIN_EMAIL='publisher-admin@example.test'
$env:E2E_ADMIN_PASSWORD='test-only-password'
$env:E2E_BOOK_ID='disposable-book-id'
$env:E2E_MODULE_ID='disposable-module-id'
```

Optional variables:

```text
E2E_START_SERVER=true              # start `npm run dev` for local runs
E2E_FIXTURE_PREFIX=[E2E]
E2E_STORAGE_ENABLED=true           # only with disposable R2/storage credentials
E2E_IMAGE_FIXTURE=tests/fixtures/content-studio/e2e-image.svg
E2E_VIDEO_FIXTURE=tests/fixtures/content-studio/small-video.mp4
E2E_ALLOW_PRODUCTION_MUTATION=true # required for non-local base URLs
```

Install the browser once with `npx playwright install chromium`, then run with `npm run test:e2e`. Playwright preserves screenshots, traces, and video on failure. Without the required environment, tests are reported as skipped rather than passing.
