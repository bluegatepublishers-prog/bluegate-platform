# Phase 9.0 — Student Identity & Authentication Foundation

Status: implemented locally; database migrations remain unapplied.

## Architecture alignment

- [x] Student authentication uses the existing `User` → `Student.userId` relationship.
- [x] No Prisma schema change or migration was added for Phase 9.0.
- [x] Student identity is school-scoped and publisher-scoped.
- [x] A current, active enrollment with active year, class, and section is mandatory.
- [x] The effective student access plan is resolved through the Phase 8.4 entitlement service.
- [x] No learning module, assignment, assessment, AI, analytics, or payment workflow was added.

## Authentication and session

- [x] `/student-login` reuses the shared email/password login form and forgot-password hook.
- [x] Callback URLs are internal, role-scoped, and reject cross-role or external destinations.
- [x] Successful student login defaults to `/student-dashboard`.
- [x] Student claims are derived on the server: user, student, publisher, school, and academic year.
- [x] Password errors and identity eligibility failures use the same non-enumerating login error.
- [x] Existing Admin, Teacher, School, and Super Admin destinations remain supported.

## Authorization

- [x] Proxy protects `/student-dashboard/:path*`.
- [x] Unauthenticated student routes redirect to `/student-login` with a safe callback.
- [x] Cross-role dashboard requests redirect to the authenticated role's home.
- [x] `requireStudent()` revalidates live database identity and enrollment on every request.
- [x] Session identity claims must match the live student scope.
- [x] Student pages do not accept user, student, school, publisher, or academic-year IDs from URLs.

## Student shell

- [x] Publisher branding, logo, and configured colors are reused.
- [x] Dashboard hero shows student, class, section, school, academic year, and access plan.
- [x] Plan is informational only; no upgrade or payment action is shown.
- [x] Future navigation entries are disabled and explicitly marked as upcoming.
- [x] Dashboard cards are honest placeholders with no invented statistics.
- [x] `/student-dashboard/profile` is read-only.

## Verification

- [x] Deterministic policy tests cover callback safety, role redirects, and route protection.
- [x] Service tests cover eligible login, wrong role, missing enrollment, wrong publisher, invalid year/scope, session claims, and entitlement loading.
- [x] Integration tests cover Auth.js claim wiring, `requireStudent()`, profile read-only behavior, and proxy matching.
- [x] `prisma format`, `prisma validate`, and `prisma generate` completed.
- [x] TypeScript completed.
- [x] Full test suite completed (119 passed).
- [x] Phase 9.0 scoped lint completed with no findings. Repository-wide lint still has unrelated pre-existing findings.
- [x] Production build completed.
- [x] Migration status inspected without applying migrations; only the existing Phase 8.3 and 8.4 migrations are pending.
- [x] Final git diff and whitespace checks completed.
