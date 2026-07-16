# Phase 9.11 Mentor Platform Checklist

Status: implementation complete in the worktree; additive migration pending and `TUTOR_PLATFORM` disabled by default.

## Architecture and identity

- [x] A Mentor is a distinct `MENTOR` identity, not a Teacher, School, Parent, Publisher Admin, or Student.
- [x] Types support `BLUEGATE_MENTOR`, `PRIVATE_MENTOR`, and future `SCHOOL_MENTOR`.
- [x] Mentor authentication reuses Auth.js and requires an active Mentor, active Publisher, and enabled Publisher Mentor feature.
- [x] Student authority comes only from an active, current-year `MentorStudentAssignment`.
- [x] Student Mentor access additionally requires the existing `INDIVIDUAL_PREMIUM_MENTOR` plan.
- [x] One active PRIMARY Mentor per student/year is enforced with a unique active key and transactional advisory lock.
- [x] Reassignment ends prior authority without deleting history; supporting mentors remain schema-compatible but are not assignable in this phase.

## Dashboard and student profile

- [x] `/mentor-login` and `/mentor-dashboard` are role-routed and protected.
- [x] Dashboard shows assigned students, open gaps, active remedials, recent Mentor activity, upcoming session placeholders, and an honest zero unread-note state because no messaging exists.
- [x] Mentor student list begins from Mentor assignments and provides no school-wide search.
- [x] Assigned profiles expose safe current-year reading, revision, practice, assessment, reports, gaps, remedials, and learning timeline projections.
- [x] Teacher resources, answers, raw responses, protected URLs, AI conversations, prompts, providers, models, quotas, and system instructions are absent.

## Notes, remedials, AI and sessions

- [x] Observation, Encouragement, Action Plan, future Parent Note, and Private Note records are immutable, timestamped, scoped, and audited.
- [x] Mentor can monitor learning paths, record review, and recommend completion without updating generated plans or academic evidence.
- [x] Student AI launch is a feature-gated, audited handoff only; it does not impersonate the student, inspect conversation history, call a provider, expose quota, or implement messaging.
- [x] Sessions store Scheduled, Completed, and Cancelled placeholders only.
- [x] No chat, messaging, video, calling, marketplace, or payment flow was added.

## Reports and security

- [x] Mentor reports show assigned count, completed remedials, open gaps, deterministic learning trend, and real streak-based study consistency.
- [x] Every read and mutation recomputes Mentor, Publisher, School, Student, academic year, enrollment, assignment, feature, and Mentor-plan scope.
- [x] Cross-mentor, cross-student, cross-school, cross-publisher, cross-year, revoked, expired, inactive, wrong-plan, and disabled-feature access fails closed.
- [x] Mentors cannot edit marks, attempts, assessments, reports, analytics, gaps, resources, remedial paths, or enrollment.

## Migration and deployment

- [x] Additive `Mentor`, `MentorStudentAssignment`, `MentorSession`, `MentorNote`, `MentorActivity`, and `MentorAvailability` storage uses restrictive foreign keys and scoped indexes.
- [x] Migration marks `TUTOR_PLATFORM` implemented but creates no enabled `PublisherFeature`.
- [ ] Apply `20260716090000_mentor_platform` only after every earlier pending migration through the controlled release workflow.
- [ ] Provision Mentor users and assignments through an approved administrative workflow or disposable fixtures.
- [ ] Explicitly enable the Mentor feature for an approved test Publisher; do not enable globally.
- [ ] Run authenticated browser, database concurrency, accessibility, and disposable cross-tenant manual tests before release.

## Rollback

Disable `TUTOR_PLATFORM`, remove Mentor navigation/login entry points, and roll back application code. Preserve additive assignments, notes, sessions, and activities as historical records. Any database rollback requires separately reviewed destructive SQL.
