# Publisher Admin Tenant-Isolation Inventory

Status: Stage 2 implementation inventory, 2026-07-17. This internal document is not application content.

## Authorization boundary

`lib/publisher-admin-authorization.ts` is the final live authorization boundary. It starts with the authenticated session user ID, reloads `User` and its `Publisher`, applies the Stage 1 role/publisher invariant, requires live role `ADMIN`, a non-null matching `publisherId`, and an active publisher, then returns minimum trusted context. Pages and Server Actions redirect/fail closed; route handlers return 401 for no session, 403 for a stale/demoted/malformed identity, and the same generic 404 for missing and foreign records. Browser publisher IDs are ignored or overwritten.

The Admin layout remains defense in depth only. Services and mutations re-authorize independently. Global `Class` and `Subject` records are reference catalogs and Publisher Admin access is read-only. `BookSeries` is publisher-owned. Legacy contact messages have no ownership model and therefore fail closed.

## Surface inventory

| Surface | Operations | Ownership source / previous risk | Final remediation |
|---|---|---|---|
| `app/admin/layout.tsx`, dashboard | page access, counts | Live `User.publisherId`; dashboard counts were placeholders | Live guard; teacher/school/book/resource counts scoped to publisher |
| `app/admin/books/**` | list, detail, preview, create, update, delete, publish/feature, chapters, questions, outcomes, activities | `Book.publisherId`; several reads and knowledge actions were ID-only | List/detail layout and APIs scoped; every knowledge Server Action rechecks scoped book ownership; relation validation applied |
| `app/api/admin/books/**` | list/create/read/update/delete, class lookup | `Book.publisherId`; class/subject global; `BookSeries.publisherId` | Live API auth; forced publisher on create/update; scoped ISBN; tenant series validation; generic 404; global class mutation denied |
| `app/admin/resources/**`, `app/api/admin/resources/**` | list/create/update/delete/file replacement | `Resource.publisherId`; old routes used session role and check-then-ID mutation | Live guard; forced publisher; scoped update/delete; only stored old URLs are deleted; generic 404 |
| `app/api/upload/route.ts` | Blob upload-token issue | School via live school account; all Admin upload scopes via publisher actor | Admin scopes require live DB-backed Admin; branding pathname must match live publisher; type/size/path policy retained |
| `app/admin/teachers/**`, teacher action/API, `lib/teachers.ts` | list/detail/verify/AI plan | Teacher -> School -> `School.publisherId`; ID-only mutations existed | Live guard in page/service/API/action; scoped relation filters and scoped `updateMany`; foreign/missing safe result |
| `app/admin/schools/**`, `lib/schools.ts` | cities/list/detail | `School.publisherId`; global lists/details existed | Live service and page guard; all reads scoped |
| `app/admin/school-requests/**`, `lib/onboarding-approvals.ts` | list/approve/reject/suspend | `School.publisherId`, immutable review carries publisher | Live guard; transaction loads scoped school; write also scoped; teacher suspension limited to scoped school |
| Students, academic years, classes, sections, subject assignments, enrollments | indirect Admin reporting/adoption access | School academic graph rooted at publisher-owned School | No standalone Admin CRUD routes found; reports/adoptions scope at publisher and validate nested school graph |
| `app/admin/book-adoptions/**`, actions, `lib/book-adoptions.ts` | list/detail/approve/reject/revoke/history | `SchoolBookAdoption.publisherId`, school and book publisher | Live guard; all reads/transitions scoped; adoption validator requires school/book publisher match; foreign/missing indistinguishable |
| `app/admin/inspection-requests/**`, `lib/inspection-requests.ts` | list/detail | `InspectionRequest.publisherId` | Live page/service guard and publisher filters |
| `app/admin/contact-messages/**`, API | list/status change | No current Prisma ownership model; legacy global delegate | Fail closed: page explains unavailable state; API authenticates then returns 403; no global read/write |
| `app/admin/master/**`, `app/api/admin/master/classes`, subjects, book classes | global reference reads/mutations | `Class` and `Subject` are global reference data | Live auth on each route/service/page; Publisher Admin mutation endpoints return 403; mutation UI removed |
| `app/api/admin/master/series` | series lookup | `BookSeries.publisherId` | Live auth and publisher filter |
| `app/api/admin/blog` | blog placeholder/read-write endpoint | No tenant-owned Blog model or sensitive persistence currently | Live API authentication applied; no publisher data mutation exists |
| `app/admin/reports`, gaps, remedials and analytics services | aggregate reads | Explicit `publisherId` on analytics/gap/remedial records | Live `requirePublisherAdmin`; publisher-scoped aggregate queries; no student identity exposure added |
| `app/admin/ai/**` | provider diagnostic Server Action | Global provider configuration; previously JWT-role only | Live Publisher Admin guard; diagnostic does not mutate tenant/global configuration |
| `app/admin/publisher-settings/**` | read/update branding/features | Live actor publisher | Live guard; update target derived only from actor publisher; feature flags remain platform-controlled |
| Notifications | dashboard link only | No `app/admin/notifications/**` route or Admin mutation found | No exposed surface to secure; dashboard link currently resolves to not-found |
| Public preview / protected full book | Admin preview and existing entitlement readers | `Book.publisherId`; entitlement services remain role-specific | Admin preview is under scoped book layout; public limited preview and protected full-book entitlement architecture unchanged |
| File cleanup helpers | Blob delete on book/resource replacement/deletion | Stored URL on scoped DB record | Routes resolve scoped record first and pass only stored prior URLs to deletion helpers; browser URL is never used as deletion authority |

## Previously unauthenticated route handlers

The blog endpoint, master class/subject/series endpoints, book-class endpoint, and legacy contact-message endpoint now authenticate themselves. All files under `app/api/admin/**` use the live API guard; `/api/upload` uses the same live guard for every Admin upload scope.

## Ownership decisions and fail-closed legacy data

- `Class` and `Subject`: platform-global, Publisher Admin read-only.
- `BookSeries`: publisher-owned and always filtered by live publisher.
- Publisher-owned rows with `publisherId = null`: inaccessible to Publisher Admins. The pending tenancy migration must be reviewed and applied separately before legitimate legacy rows become visible.
- Contact messages: ownership is absent from the current Prisma model. A future migration must add an immutable publisher association and a reviewed backfill before access can be enabled.

## Stage 3 immutable audit-event requirement

No general immutable security audit-event model exists. Domain review/history tables are not a substitute. Stage 3 should add an append-only security event containing actor user ID, publisher ID, action, target type, target ID, server timestamp, outcome, and allow-listed safe metadata. It should cover book/resource/file mutations, school approvals, teacher verification/plan changes, adoption decisions, publisher settings, and denied cross-tenant attempts. Events must not store secrets, credentials, raw file tokens, or sensitive request bodies, and Publisher Admins must not be able to update/delete them.
