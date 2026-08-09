# Content Studio browser verification

The repository uses Playwright through `playwright.config.ts`. V2 browser tests are opt-in and use a reserved disposable Book/Chapter/Module fixture.

## V2 fixture setup

Use a local/test database and an active publisher admin account. No credentials are stored in source.

```powershell
$env:E2E_BASE_URL='http://localhost:3000'
$env:E2E_ADMIN_EMAIL='publisher-admin@example.test'
$env:E2E_ADMIN_PASSWORD='test-only-password'
$env:E2E_FIXTURE_LAYOUT='V2'
$env:E2E_DISPOSABLE_FIXTURE='true'
npm run e2e:fixture
```

The setup reuses the existing publisher admin, creates or resets:

- `[E2E] Layout V2 Test Book`
- `[E2E] Layout V2 Chapter`
- `[E2E] Layout V2 Module`

The module is reset before every V2 test to one canonical V2 page with no author-created frames. The fixture slug is reserved and setup refuses to mutate it if it belongs to another publisher.

For protected image resources, configure the existing R2 variables and enable reusable fixture assets:

```powershell
$env:E2E_STORAGE_ENABLED='true'
```

This provisions two small SVG resources, landscape and portrait, at deterministic private storage keys. Resources are never deleted by reset. Without storage enabled, image transform coverage is reported as skipped while non-resource V2 workflows still run.

## Safety

Fixture mutation requires `E2E_DISPOSABLE_FIXTURE=true`. Non-local URLs also require `E2E_ALLOW_PRODUCTION_MUTATION=true`; do not use that flag against real production data.

The V2 suite authenticates through the existing admin login using `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`. It does not hard-code credentials or inspect browser storage.

## Run

```powershell
npx playwright test e2e/content-studio-v2.spec.ts
```

The five focused workflows cover frame move/resize persistence, image FIT/FILL/CROP pan/zoom persistence when storage is available, text wrapping, educational children, and layer/text-over-image ordering. Each test saves and reloads. Console errors, page errors, failed important requests, and protected resource failures fail the test.

When `E2E_FIXTURE_LAYOUT=V2`, the older pre-V2 Content Studio spec is skipped so it cannot mutate the reserved V2 module. Without that flag, the existing legacy harness retains its current environment contract.
