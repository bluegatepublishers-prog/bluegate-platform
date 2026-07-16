# Phase 8.3 Resource Audience Verification

## Rules and role matrix

Resource type never determines audience. Existing and unclassified resources default to `TEACHER_ONLY`. `STUDENT` and `BOTH` are authenticated audiences and never public-publishing flags.

| Role | Teacher only | Students | Both | Additional checks |
|---|---:|---:|---:|---|
| Publisher Admin | Manage | Manage | Manage | Authenticated publisher ownership and Resources feature |
| School | View | View | View | Existing publisher and academic policy; cannot classify |
| Teacher | Use | Use/preview | Use | Publisher, active teacher/school, assignment/adoption where applicable, Resources feature |
| Future Student | Deny | Use | Use | Enrollment, year, section subject, adoption, publisher, entitlement and feature checks |
| Public | Deny | Deny | Deny | Existing explicit public-preview rules only |

## Server and AI boundaries

- [ ] Admin list, fetch, create, update and delete derive publisher ownership from the session.
- [ ] Direct preview/open/download and bookmark mutations repeat role, publisher, entitlement, audience and feature checks.
- [ ] Section-subject assignment does not override audience; assignment UI displays its badge.
- [ ] Teacher AI may use every audience only after normal grounding and entitlement checks.
- [ ] Future student AI queries add `audience IN (STUDENT, BOTH)` and never include internal URLs unnecessarily.
- [ ] `STUDENT` or `BOTH` never exposes an internal resource through a public page or API.

## Manual security tests

- [ ] Admin creates each of `TEACHER_ONLY`, `STUDENT`, and `BOTH`; required validation rejects unknown values.
- [ ] Admin list badges and audience filter show friendly wording while search and type filters still work.
- [ ] A cross-publisher Admin cannot list, edit, classify or delete another publisher's resource.
- [ ] An entitled teacher can use all three audiences but cannot use another publisher or unrelated academic context.
- [ ] Student predicate rejects `TEACHER_ONLY` and permits `STUDENT` and `BOTH` only within its outer enrollment/adoption scope.
- [ ] Direct URLs and section-subject assignment cannot bypass audience.
- [ ] School behavior remains publisher-scoped and read-only for audience.
- [ ] `STUDENT` and `BOTH` remain non-public.
- [ ] Disabling `RESOURCES` hides navigation and blocks direct module access.
- [ ] Bookmark and download mutations deny inaccessible resources.

## Migration deployment checklist

- [ ] Review SQL: enum and additive non-null column/default only; no drops or deletes.
- [ ] Confirm every existing row becomes `TEACHER_ONLY`; no row becomes student-visible.
- [ ] Confirm resource IDs, URLs, assignments, downloads and bookmarks are unchanged.
- [ ] Back up and rehearse against a non-production copy.
- [ ] Apply with the controlled deployment process (not during implementation).
- [ ] Verify the publisher/audience/published index and null count.
- [ ] Run the manual matrix with disposable cross-tenant fixtures.
- [ ] Roll back application code before database rollback; enum/column removal requires separate reviewed SQL.

## Audience UX verification

- [ ] Admin resource rows show a readable friendly audience badge, not a raw enum value.
- [ ] Admin search, type, and audience filters work together and remain publisher-scoped.
- [ ] Invalid audience query values are ignored safely and never alter authorization.
- [ ] Filtered empty states explain whether no teacher-only, student-facing, or generally matching resources exist.
- [ ] Section-subject resource options show type, class, subject, and audience badges.
- [ ] The assignment audience filter defaults to all resources, including teacher-only material.
- [ ] Assignment helper text explains that teacher-only resources remain hidden from students and assignment alone does not change audience.
- [ ] On narrow screens, filters wrap and resource metadata remains readable without relying on badge colour alone.
- [ ] Keyboard users can reach all search, select, checkbox, clear, and submit controls.

## AI Resource Boundaries

- Teacher AI may use authorised resources with `TEACHER_ONLY`, `STUDENT`, or `BOTH` audience.
- Future Student AI may use only authorised resources with `STUDENT` or `BOTH` audience; `TEACHER_ONLY` is rejected before collection or prompt construction.
- Approved structured book knowledge is governed by book entitlement and AI readiness, independently of `Resource.audience`. Resource audience applies only to `Resource` records and resource-derived knowledge.
- The current collector uses reviewed/extracted chapter text, approved learning outcomes, questions, activities, summaries, and keywords. It does not query Resource records or uploaded PDF/PPT/DOC/video contents, so `RESOURCES` is not required for current AI Studio generation.
- A future extraction or retrieval system must retain the originating `resourceId`, join back to the publisher-scoped Resource, apply academic/adoption scope, and call the AI audience filter before returning text. Orphan resource-derived text must be rejected.
- Prompt previews and client payloads must not contain protected file URLs, full-book locations, Blob tokens, or source bodies derived from a resource the intended AI audience cannot access.
- Stored/rendered resource source metadata is limited to safe titles, types, and server-internal IDs; protected URLs, provider payloads, and cross-publisher identifiers are excluded.

### Manual AI boundary checks

- [ ] Teacher context allows `TEACHER_ONLY`, `STUDENT`, and `BOTH`.
- [ ] Student context rejects `TEACHER_ONLY` and safely reports unavailable learning material.
- [ ] Student context allows `STUDENT` and `BOTH`.
- [ ] Disabling `RESOURCES` does not disable structured-book-only AI Studio generation.
- [ ] No Resource URL or resource-derived body enters current knowledge packages, prompts, previews, citations, or stored source metadata.
- [ ] Any future resource collector applies publisher, academic, adoption, feature, and AI audience filters before prompt construction.

## Automated Test Coverage

The lightweight Node test runner with `tsx` covers deterministic policy behavior without a browser, database reset, OpenAI key, or provider call. The suite currently contains six test files and 63 tests.

- Resource-audience helper tests cover exact validation, friendly labels, teacher/student predicates, deterministic Prisma filters, in-memory filtering, and safe assertion messages. Invalid and unknown values fail closed.
- AI boundary tests cover deterministic teacher/student allowed sets, Prisma filters, in-memory filtering, and safe teacher-facing and student-facing denial messages. Provider and OpenAI modules are not imported.
- Teacher access tests execute the central access orchestration with lower-level dependency fakes. They cover inactive teacher, inactive publisher-school context, disabled Resources feature, missing active academic context or assignment, wrong subject, missing SectionSubject, missing approved adoption, cross-publisher resource, and all three allowed teacher audiences.
- School access tests execute the central access orchestration for approved same-publisher context and deny wrong publisher, missing adoption, disabled feature, unrelated academic context, and crafted cross-tenant resource IDs.
- Query-policy tests assert active teacher assignment conditions, same-school/year/subject adoption scope, same-publisher School adoption scope, and publisher-scoped Admin filtering and direct update/delete lookup.
- Bookmark tests execute authorize-before-find/create/delete ordering, repeat behavior, unauthorized/cross-publisher denial, and no mutation after denial. Teacher-only eligibility remains governed by the tested teacher predicate; the future student predicate denies it.
- Download-history tests execute authorize-before-record-before-return ordering, exactly one record per successful request, no record or URL on authorization/cross-publisher/feature denial, and the current append-only repeated-download behavior.
- Section-subject tests cover valid same-publisher assignment; cross-publisher Resource and Book rejection; wrong school, class, subject, and resource rejection; and confirmation that assignment updates never alter `Resource.audience`.
- Feature-gate tests cover central Teacher and School denial, bookmark/download denial through central authorization, Admin API checks, Resources layout guards, and the section-subject Server Action guard.
- Direct-access tests cover central Teacher/School authorization, teacher preview ordering, Admin publisher-scoped edit lookup, safe 404 download bodies, and authorize-first mutation delegation.
- Migration assertions verify the enum values, additive non-null `TEACHER_ONLY` default, publisher/audience/published index, no automatic `STUDENT`/`BOTH` classification, no destructive SQL, and no same-transaction enum data update.

Known automated-test gaps: no database-backed Prisma fixture execution, authenticated Next.js request/session invocation, direct Server Action invocation, or browser rendering is included. The schema has no School active/suspended field, so tests enforce active publisher context but cannot test school deactivation as a distinct state without an approved schema/architecture change. Pending and revoked adoption behavior is covered by the fail-closed approved-only predicate rather than live rows.

Manual tests remain required with disposable tenants for real session cookies, route/layout status behavior, Prisma relation semantics against the pending migration, pending/revoked adoption rows, protected Blob delivery, navigation/empty states, and mobile/keyboard accessibility. Browser coverage is not claimed.
