# Phase 9.10 Personalized Remedial Learning Checklist

Status: implementation complete in the worktree; migration pending and `REMEDIALS` disabled by default.

## Contract and policy

- [x] `BG-REMEDIAL-1.0` maps only stored Phase 9.9 gaps to deterministic priorities, due windows, and ordered steps.
- [x] Recommendation inputs contain gap identifiers/severity plus approved-content availability and entitlement decisions; no attempts, answers, question text, prompts, or AI conversation text are read.
- [x] Every recommendation references an approved/adopted book chapter, exact page range, revision surface, supported practice surface, published assessment, student-audience video/PPT, or optional entitled Student AI context.
- [x] No text/content is generated and no worksheet or mentor step is invented when an explicitly typed approved object does not exist.
- [x] Drafts have stable policy/fingerprint/generation keys. Recomputes preserve history and never mutate recommendation content.

## Review, path, and completion

- [x] Automatic generation creates `DRAFT` only. Students see only teacher-reviewed `ACTIVE` or historical `COMPLETED` plans.
- [x] Teacher assignment scope is revalidated server-side for review, recompute, and step closure.
- [x] Step transitions are append-only events with pending, in-progress, completed, skipped, and teacher-closed vocabulary.
- [x] Trusted reading, revision, practice, assessment, and optional Student AI completions update exact matching active steps after the source action commits.
- [x] Required completed/teacher-closed steps complete the plan; optional steps do not block completion.

## Role and security surfaces

- [x] Student: friendly own-student/current-year reviewed path, Premium plus publisher feature gate.
- [x] Teacher: assigned learner plans, immutable recommendations, review/activate, recompute, and close-step actions.
- [x] School: current-school/current-year read-only assigned/completed/pending/overdue and subject aggregate.
- [x] Publisher: tenant aggregate resource assignment, completion, and resolved-gap effectiveness with honest no-data states and no identities.
- [x] `REMEDIALS` is marked implemented by the additive migration; no publisher is enabled by migration or seed.

## Automated verification

- [x] Deterministic mapping, ordering, deduplication, priority, and due-date tests.
- [x] Source-contract tests for approved content only, no raw learning text, student draft exclusion, teacher-only activation, Premium/feature gates, and additive migration safety.
- [ ] Manual cross-tenant/cross-school/cross-student URL denial and teacher assignment denial on a disposable migrated database.
- [ ] Manual lifecycle: gap → draft → teacher review → step completion → reassessment → gap recovery.

## Deployment checklist

- [ ] Review and test the pending additive migration on a disposable Neon branch/database.
- [ ] Apply migrations separately; do not run seed, backfill, or enable features automatically.
- [ ] Deploy with `REMEDIALS` disabled for every publisher, then verify existing learning flows.
- [ ] Enable one approved test publisher only after entitlement, content-audience, teacher-scope, and wording review.
- [ ] Monitor generic best-effort refresh failures without logging student identifiers or learning content.
- [ ] Roll back access by disabling `REMEDIALS`; retain plans, steps, events, and reviews as historical records.
