# Classroom Assignment Module QA

**Status:** implementation complete; release approval pending  
**Migration:** `20260726135438_classroom_assignments`  
**Feature gate:** `ASSIGNMENTS` must be implemented and explicitly enabled per publisher

## Release preconditions

- Apply the additive migration in the target environment through the reviewed deployment process.
- Confirm the migration marks the feature implemented but does not enable any publisher.
- Explicitly enable `ASSIGNMENTS` only for approved test publishers.
- Confirm private R2 configuration and assignment/submission upload policies.
- Run Prisma validation/generation, TypeScript, lint, build, tests, and `git diff --check`.

## Teacher acceptance workflow

- Sign in as an approved current teacher with a live official class or subject assignment.
- Open My Classes → Assignments and test Active, Draft, Scheduled, Closed, and Archived filters.
- Test title search, subject filter, list/card preference persistence, empty state, loading state, and error recovery.
- Create every assignment type with general, subject, adopted-book, and approved-chapter contexts.
- Save a draft, schedule for a future server time, publish immediately, edit a draft/scheduled item, close, reopen, publish results, and archive.
- Attach an uploaded file, owned class material, assigned protected resource, and chapter reference.
- Confirm ordinary hard deletion is unavailable and removed uploaded attachments are cleaned from private storage.
- Review student status rows, filters, late indicators, attempts, grading, feedback, return-for-correction, and result release.

## Student acceptance workflow

- Sign in as a verified active student with a current enrollment in the assignment section.
- Confirm only visible published or due scheduled assignments appear.
- Open assignment instructions and authorized attachments.
- Save text-only, file-only, and combined drafts where permitted.
- Confirm final submission, submitted timestamp, server-derived late state, and overwrite prevention.
- Have the teacher return work, then verify correction/resubmission creates a new attempt while preserving the previous attempt.
- Confirm feedback is shown for returned work and marks remain hidden until results are released.

## Authorization and tenant isolation

- Deny inactive/unverified teachers and students.
- Deny teachers without a current official assignment to the section.
- Deny another teacher’s assignment even within the same school.
- Deny wrong publisher, school, academic year, class, section, student, and enrollment status.
- Confirm browser-supplied ownership, grader, marks, attempt, status, and timing fields are ignored.
- Confirm foreign and nonexistent assignment IDs produce equivalent safe responses.
- Disable the publisher feature and directly test pages, actions, upload initialization, and protected downloads.

## Timing, lifecycle, and scheduling

- Verify draft and future scheduled assignments are invisible to students.
- Verify scheduled assignments become visible based on server time.
- Verify due time determines late status; the browser cannot choose it.
- Verify late work is accepted only when enabled.
- Verify close time and CLOSED status prevent new submissions.
- Verify reopening clears the explicit closure while preserving prior work.
- Verify archived assignments are excluded from normal student and active teacher lists.

## Submission, grading, and attachment security

- Confirm one student may not read or mutate another student’s submission.
- Test maximum file count, per-assignment size, MIME allow-list, empty file, extension mismatch, executable rejection, and foreign object key rejection.
- Confirm private object keys and permanent protected URLs never render in browser payloads.
- Confirm assignment and submission download URLs are short-lived and issued only after live authorization.
- Confirm failed attachment persistence removes the newly uploaded private object.
- Confirm referenced Resource and ClassMaterial files are never deleted as shared binary data.
- Test marks at zero, total marks, below zero, and above total; test feedback-only grading when total marks is absent.
- Confirm grading and return transitions write the audit event in the same transaction.
- Confirm audit metadata contains no response text, feedback, raw URL, object key, or credentials.

## Responsive and accessibility checks

- Test authenticated teacher and student flows at 320, 375, 768, 1024, and 1440 pixels.
- Confirm there is no horizontal viewport scrolling, wide fixed table, clipped filename, or covered sticky control.
- Confirm controls wrap, forms remain one column on mobile, long titles/filenames break safely, and touch targets remain at least 44 pixels.
- Use keyboard-only navigation for filters, forms, details, confirmation actions, and attachment controls.
- Confirm semantic headings, labels, focus indicators, status text beyond color, `aria-live` mutation feedback, and accessible date/time inputs.

## Release blockers and approval gate

Release is blocked by any cross-tenant access, public protected URL, client-authoritative ownership/timing/marks, unbounded grade, destructive assignment deletion, missing audit event, migration drift, horizontal viewport scrolling, failing automated check, or feature auto-enablement.

Final approval requires Security, Product, School Operations, and QA sign-off against this checklist.

