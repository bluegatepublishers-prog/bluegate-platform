# Phase 9.1 — Student Subjects and Approved Books

Status: implemented locally; no Phase 9.1 schema change or migration.

## Subject resolution flow

- [x] Every page starts from `requireStudent()` and its live active identity/enrollment context.
- [x] Subjects resolve through current enrollment → active section → active `SectionSubject` → active Subject.
- [x] School, academic year, class, section, and publisher values are server-derived.
- [x] Route `sectionSubjectId` is treated only as a lookup candidate and must exist in the safe authenticated subject result.
- [x] Subjects remain visible when an approved book is unavailable.
- [x] Safe view models omit protected file URLs, adoption notes, reviewer identities, and publisher internals.

## Approved-book rules

- [x] A shown book requires an active `APPROVED` adoption for the authenticated school, publisher, year, class, section, and SectionSubject.
- [x] The book must be published, same-publisher, class-compatible, and subject-compatible.
- [x] Pending, rejected, revoked, prior-year, cross-tenant, draft, or incompatible books are excluded.
- [x] Full-book access uses `/api/books/[bookId]/full-pdf`; `fullBookPdf` is never selected by the student resolver or rendered.
- [x] Full approved book access is independent of premium plan and remains available to `SCHOOL_BASIC`.

## Teacher display rules

- [x] Only an active `SUBJECT_TEACHER` assignment matching school, year, class, section, and subject is displayed.
- [x] A class-teacher assignment is not substituted.
- [x] Missing assignment displays “Teacher not assigned yet”.

## Resource audience and entitlement rules

- [x] Only published `STUDENT` and `BOTH` resources are candidates; `TEACHER_ONLY` is fail-closed.
- [x] Runtime policy rechecks publisher, normalized class, normalized subject, and SectionSubject assignment.
- [x] The `RESOURCES` publisher feature must be implemented and enabled.
- [x] Existing Phase 8.4 architecture requires an approved adoption before student resources are usable.
- [x] Resource metadata view models contain no `fileUrl`.
- [x] Resource access recomposes the centralized resource entitlement engine before delivery.

## Protected route authorization

- [x] `/api/student/resources/[resourceId]/open` calls `requireStudent()`.
- [x] The resource ID must first occur in the authenticated student’s safe subject view.
- [x] The central entitlement service rechecks year, section, SectionSubject, publisher, adoption, feature, publication, and audience.
- [x] Denial returns a generic 404 without revealing existence or a file URL.
- [x] Successful delivery redirects only after authorization and sets `private, no-store` and `no-referrer`.

## Student UX

- [x] `/student-dashboard/subjects` provides responsive subject cards and the required empty state.
- [x] Dashboard shows at most six real subjects and a “View All Subjects” action.
- [x] Subject detail shows overview context, approved book, grouped resources, and an honest future-chapters placeholder.
- [x] Subject navigation is enabled; future Books, Resources, Bookmarks, and Notifications entries remain disabled.
- [x] Cards stack on narrow screens, actions have large touch targets, and no wide tables or raw IDs are shown.
- [x] No progress percentage, recent activity, assignments, quizzes, AI, reports, remedials, or mentor capability was added.

## Automated verification

- [x] Resolver policy covers section scope, inactive subjects, no-book visibility, adoption states/year/publisher, book inclusion, resource audience/tenant/class/subject/publication/feature/adoption, and subject-teacher display.
- [x] Identity service explicitly fails closed on a non-active enrollment dependency result.
- [x] Resource service covers foreign IDs, central denial, authorize arguments, and valid success.
- [x] Integration assertions cover server-derived query scope, safe selects, protected full-book link, resource authorization ordering/headers, detail-route validation, and navigation.
- [x] Full Node test suite passes (143 tests).

## Manual test checklist

- [ ] Sign in as a real active Student with a current enrollment and open My Subjects on desktop and mobile.
- [ ] Verify an active SectionSubject without adoption remains visible with the no-approved-book message.
- [ ] Verify approved books show the correct cover/title/series/class/subject and “Read Full Book”.
- [ ] Verify pending, rejected, revoked, prior-year, cross-publisher, and wrong-section books never appear.
- [ ] Verify subject teacher and “Teacher not assigned yet” states with real assignments.
- [ ] Assign `STUDENT`, `BOTH`, and `TEACHER_ONLY` resources and confirm only the first two appear.
- [ ] Try copied foreign SectionSubject, Resource, and Book URLs and confirm safe denial.
- [ ] Disable `RESOURCES` and confirm resource cards/routes become unavailable while subjects and approved books remain usable.
- [ ] Inspect page HTML/network payloads to confirm no `fileUrl` or `fullBookPdf` is serialized before authorization.
- [ ] Verify keyboard focus, touch targets, card stacking, cover fallbacks, and empty states.

## Deployment checklist

- [ ] Review the Phase 9.1 diff and this authorization matrix.
- [ ] Deploy only after the already-pending Phase 8.3 and Phase 8.4 migrations are approved and applied through the controlled process.
- [ ] Confirm `RESOURCES` publisher feature records and Resource audience values in the target environment.
- [ ] Run the manual same-tenant/cross-tenant/year/section/adoption matrix with disposable accounts.
- [ ] Confirm protected storage redirect behavior and cache/referrer headers in the deployed environment.
- [ ] Monitor generic 404s without logging protected URLs or tenant details.

## Verification commands

- [x] `npx prisma format`
- [x] `npx prisma validate`
- [x] `npx prisma generate`
- [x] `npx tsc --noEmit`
- [x] `npm test` — 143 passed
- [x] Phase 9.1 scoped lint — no findings
- [x] `npm run build`
- [x] `git diff --check`
- [x] `git status --short`
- [x] `npx prisma migrate status` — database reported up to date; read-only check only
