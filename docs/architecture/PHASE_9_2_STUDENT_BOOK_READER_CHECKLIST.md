# Phase 9.2 — My Books and Student Book Reader

Date: 2026-07-13

## Scope completed

- [x] Added `/student-dashboard/books` with approved, current-year books derived from the existing student subject projection.
- [x] Added `/student-dashboard/books/[bookId]` as the primary full-book reading experience.
- [x] Enabled Books in student navigation and added real My Books data to the dashboard.
- [x] Updated subject book cards to open the reader and show real continuation state.
- [x] Kept quizzes, assignments, AI, reports, notes, highlights, offline books, and analytics out of scope.

## My Books resolution

- [x] Resolution begins with `requireStudent()`.
- [x] Books are inherited from the Phase 9.1 safe subject projection.
- [x] That projection requires active enrollment, current academic year, enrolled section, matching publisher, published book, matching class/subject, and active approved annual adoption.
- [x] Books are deduplicated by book ID.
- [x] Progress queries are scoped to the server-derived student and current academic year.
- [x] No storage URL is included in the library view model.

## Reader authorization and delivery

- [x] The reader page calls `requireStudent()` and rejects unavailable direct IDs with `notFound()`.
- [x] The requested book must first occur in the student's safe subject projection.
- [x] The reader then reuses `getBookEntitlementForAuthenticatedUser` with explicit academic year, section, and section-subject scope.
- [x] The client receives a book ID, not `fullBookPdf`.
- [x] PDF.js requests `/api/books/[bookId]/full-pdf`; the existing route authorizes before selecting the protected field and redirecting.
- [x] Denial and missing-file responses use friendly messages and do not include tenant, adoption, storage, or Prisma detail.
- [x] Public `publicPreviewPdf` behavior remains separate and unchanged.

## Reading experience

- [x] Previous and next page controls.
- [x] Labeled current-page input and total page count.
- [x] Zoom in, zoom out, and fit-width controls.
- [x] Full-screen request where the browser supports it.
- [x] Back links to My Books and the originating subject.
- [x] Responsive wrapping toolbar, horizontally scrollable bookmark strip, large controls, focus indicators, labels, and icon accessible names.
- [x] No download control and no claim that copying or screenshots are prevented.

## Reading progress

- [x] Added additive `StudentBookProgress` model scoped by student, book, and academic year.
- [x] Stores real last page, optional total pages, timestamps, and optional completion.
- [x] Percentage is derived only when a total page count exists; it is not persisted or invented.
- [x] Page and total values must be positive integers within a conservative maximum and overflow is clamped.
- [x] The server derives student ID and academic year and reauthorizes the book before upsert.
- [x] Reader saves after a 1.2 second page-change debounce rather than every small interaction.
- [x] Completion is retained if a completed book is later reopened on an earlier page.
- [x] Prior-year rows are preserved because the upsert key includes academic year.

## Page bookmarks

- [x] The existing `Bookmark` model remains resource-specific and unchanged.
- [x] Added the small, separate `StudentBookBookmark` model with page-level uniqueness.
- [x] Bookmark mutation derives student/year server-side and reauthorizes the book.
- [x] Repeated toggle behavior is deterministic and the database unique key prevents duplicate page rows.
- [x] Bookmarks support page jumps only; notes, highlights, and annotations are not included.

## Automated verification

- [x] My Books projection, deduplication, real progress mapping, and unauthorized-progress isolation.
- [x] Approved/pending/rejected/revoked, year, publisher, section, class, and subject rules remain covered by subject and entitlement policy tests.
- [x] School Basic/no-premium student book access remains covered by entitlement tests.
- [x] Protected-route ordering and absence of raw full-book URLs remain covered.
- [x] Progress validation, trusted context, successful upsert delegation, and denial before persistence.
- [x] Bookmark validation, trusted context, authorization, and uniqueness schema.
- [x] Additive migration safety.

## Manual test checklist

- [ ] Apply the pending migration in an approved deployment workflow, never with reset.
- [ ] Sign in as a student with an approved current-year adoption and confirm My Books cards.
- [ ] Confirm pending, rejected, revoked, previous-year, foreign-publisher, and foreign-section books are absent.
- [ ] Open a book, navigate pages, jump to a page, zoom, fit width, and enter/leave full screen.
- [ ] Verify controls remain usable at narrow mobile widths and with keyboard-only navigation.
- [ ] Wait after a page change, reload, and confirm Continue Reading restores the saved page.
- [ ] Reach the final page and confirm Completed/Read Again state.
- [ ] Add/remove bookmarks, reload, and confirm bookmark state and page jumps.
- [ ] Try a foreign book ID and unauthenticated reader/file requests; confirm safe denial.
- [ ] Confirm the public preview still opens for public visitors and never becomes the authenticated reader source.
- [ ] Confirm no student download button is present.

## Deployment checklist

- [ ] Review and apply `20260713180000_student_book_reading_progress` through the normal migration pipeline.
- [ ] Verify the deployed full-book Blob objects and CORS behavior work with PDF.js through the protected route.
- [ ] Run Prisma generation, type checking, tests, and production build in the release environment.
- [ ] Smoke-test an entitled and a denied student account.
- [ ] Monitor safe 4xx/5xx rates without logging protected Blob URLs.

## Known storage limitation

The current `fullBookPdf` value points to a public permanent Vercel Blob URL. The authenticated route authorizes before reading that value and the reader never serializes it into page props, state, metadata, or application logs. However, the route currently redirects the entitled browser to the permanent public URL, so a user can observe and reuse that URL after authorization. This is access gating, not DRM, and it cannot prevent copying or screenshots.

The approved target architecture remains private Blob storage with authenticated delivery and a short-lived signed URL (or an authenticated streaming proxy). Storage is not redesigned in Phase 9.2 because no existing private signed-delivery utility is available.
