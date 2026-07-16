# Phase 8.4 Computed Entitlement and Premium Access Foundation

## Boundary definitions

- **Annual book adoption** answers whether a school may use a publisher book in a specific academic year and academic scope.
- **Computed entitlement** answers whether the authenticated Admin, School, Teacher, or future Student may use that adopted book or resource now.
- **Premium access** answers whether an enrolled Student may use an advanced learning capability offered by the publisher.
- **Subscription and payment** will later explain commercial activation. Neither is implemented in Phase 8.4.

Book access never requires premium. Premium never bypasses publisher, school, enrollment, assignment, adoption, feature, or ResourceAudience checks.

## Entitlement vocabulary

Allowed decisions use a safe source such as Publisher Admin, School adoption, Teacher assignment, Student enrollment, School premium, or Student premium. Internal denial reasons distinguish unauthenticated/wrong role, inactive or wrong publisher, missing academic context, assignment, enrollment or adoption, audience denial, disabled feature, premium requirement, and missing records.

Ordinary users receive only capability-level messages:

- Book: “This book is not available for your account.”
- Resource: “This learning resource is not available for your account.”
- Premium: “This feature requires premium access.”
- Publisher feature: “This feature is not available on your platform.”

Raw tenant mismatches, adoption status, IDs, Prisma errors, and grant sources are not returned.

## Book entitlement rules

| Role | Computed rule |
|---|---|
| Super Admin | No implicit publisher book access; future support tooling must be explicit and audited. |
| Publisher Admin (`ADMIN`) | Same active publisher and matching Book ownership. Unpublished management access remains possible. |
| School | Active publisher, authenticated School, active/current or requested academic year, and active `APPROVED` matching adoption. |
| Teacher | Active Teacher and publisher; active year/class/section assignment; subject match for Subject Teacher; matching active approved adoption. |
| Future Student | Active Student and enrollment in the matching year/section plus active approved adoption. Premium state is not consulted. |

Public preview remains a separate public-file policy.

## Resource entitlement rules

Resource entitlement composes the Phase 8.3 authorization helpers:

- Publisher Admin: active publisher, `RESOURCES` feature, and publisher-owned Resource.
- School: current School resource policy, same publisher, academic scope, approved adoption, and `RESOURCES` feature.
- Teacher: current active assignment/adoption policy, same publisher, `RESOURCES` feature, and any of `TEACHER_ONLY`, `STUDENT`, or `BOTH`.
- Future Student: active enrollment, same publisher and section, approved adoption, `RESOURCES` feature, published Resource, and audience `STUDENT` or `BOTH`.

Premium state does not change ResourceAudience.

## Student access grant model

`StudentAccessGrant` is additive and history-preserving. Each row is tied to one Student and AcademicYear and records plan, source, active period, optional grantor, and timestamps. No payment, checkout, renewal, invoice, coupon, refund, or provider fields exist.

Sources are `SCHOOL`, `INDIVIDUAL`, `PUBLISHER_ADMIN`, and `MANUAL_TEST`. No grant means `SCHOOL_BASIC`; the seed creates no premium grants. A later controlled operation may issue `SCHOOL` grants to selected Students without comma-separated IDs. Large all-school/class/section activation requires a scale review before materializing large numbers of rows.

## Effective plan precedence

Only active grants for the requested academic year whose start/end period includes the current time participate:

1. `INDIVIDUAL_PREMIUM_MENTOR`
2. `INDIVIDUAL_PREMIUM`
3. `SCHOOL_PREMIUM`
4. `SCHOOL_BASIC`

Plan strength wins first; source and latest start time provide deterministic ties. The resolver does not infer payment success.

## Premium feature matrix

| Capability | School Basic | School Premium | Individual Premium | Individual Premium + Mentor |
|---|---:|---:|---:|---:|
| Full approved book | Yes, via adoption | Yes, via adoption | Yes, via adoption | Yes, via adoption |
| Basic student resources | Yes, via audience/academic policy | Yes | Yes | Yes |
| Homework / assignments | No | Yes | Yes | Yes |
| Interactive quizzes / assessments | No | Yes | Yes | Yes |
| Reports / progress analytics | No | Yes | Yes | Yes |
| Gap analysis / remedials | No | Yes | Yes | Yes |
| Revision planner | No | Yes | Yes | Yes |
| Student AI | No | Yes if publisher offers it | Yes if publisher offers it | Yes if publisher offers it |
| School teacher support | No | Yes | No | No |
| Tutor/mentor placeholder | No | No | No | Yes if publisher offers it |

Publisher feature availability and plan entitlement are separate mandatory checks. Features without an exact implemented `PlatformFeatureKey` remain unavailable at the server boundary even when included by a plan.

## Central service layout

- `types.ts` defines narrow requests, subjects, decisions, sources, deny reasons, and premium vocabulary.
- `book-policy.ts` and `resource-policy.ts` contain deterministic decision functions.
- `book.ts` and `resource.ts` resolve server-owned identity, publisher, academic, adoption, and resource facts.
- `student-plan-policy.ts` resolves the strongest active plan; `student-plan.ts` loads trusted grants.
- `features-policy.ts` owns the plan matrix; `features.ts` combines it with Publisher features.
- `student.ts` prepares the future authenticated Student context without exposing a route or UI.
- `errors.ts` maps internal decisions to safe capability-level messages.

## Existing integrations

- [x] Full-book route authorizes before selecting `fullBookPdf` and preserves private no-store/no-referrer redirect headers.
- [x] Teacher AI book selectors include only centrally entitled books.
- [x] Teacher AI draft preparation and generation recheck centralized Book entitlement before knowledge collection/provider execution.
- [x] Teacher download/bookmark, School download, Teacher preview, and Admin direct edit use centralized Resource entitlement composition.
- [x] Phase 8.3 ResourceAudience and mutation-order tests remain passing.

## Future Student integration

The server-only resolver follows: authenticated Student → active Student → School → active Publisher → active enrollment/year/section → effective plan. Book and Resource services independently add adoption and ResourceAudience. No Student login, Dashboard, library, AI route, or client exposure is included.

## Automated coverage

The Node/`tsx` suite has 11 files and 103 deterministic tests. Phase 8.4 adds Book role/adoption tests, Resource role/audience tests, effective-plan period/precedence tests, premium matrix tests, safe-error tests, route/AI ordering assertions, and additive migration assertions. No OpenAI/provider module is called.

## Manual test checklist

- [ ] Apply both pending migrations only in an approved disposable environment.
- [ ] Create same- and cross-publisher Admin, School, Teacher, Student, Book, Resource, and adoption fixtures.
- [ ] Verify pending/revoked/expired adoption rows deny full-book and book-scoped Resource access.
- [ ] Verify Student approved-book access with no grant and with every plan.
- [ ] Verify expired/future/inactive grants in Postgres are ignored.
- [ ] Verify disabled Publisher features deny premium capabilities for every plan.
- [ ] Verify full-book and Resource URLs never appear in denied payloads or logs.
- [ ] Verify private Blob/signed URL behavior when protected storage is implemented.
- [ ] Verify real authenticated Next.js request/session behavior for each current role.

## Migration deployment checklist

- [ ] Confirm Phase 8.3 migration is reviewed and ordered before Phase 8.4.
- [ ] Review Phase 8.4 SQL: two new enums, one new table, indexes, and restrictive/history-safe foreign keys only.
- [ ] Confirm no Student is backfilled as premium and no existing Book/Resource/adoption row changes.
- [ ] Back up and rehearse both migrations against a non-production copy.
- [ ] Verify null/orphan counts and indexes after controlled deployment.
- [ ] Run the manual role/year/tenant matrix with disposable fixtures.
- [ ] Roll back application code before any separately reviewed destructive database rollback.

## Known gaps

- School has no separate active/suspended field; active Publisher context is enforced.
- No subscription product, payer, billing lifecycle, activation UI, or audit-event model exists yet.
- No bulk all-school/class/section grant operation is implemented.
- No database-backed test fixtures, authenticated Route Handler invocation, browser tests, or live protected-storage tests are included.
