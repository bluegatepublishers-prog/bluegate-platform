# Student Dashboard Phase 1 — Audit, Stabilization and UX Integration

## Executive Summary

This document records the audit of the existing student dashboard routes and provides a prioritized plan to transform them into one coherent, simple learning experience. No new routes, Prisma schema changes, or migrations are introduced in this phase.

## Current Route Inventory

### Active Routes
- `/student-dashboard` — Overview (page.tsx)
- `/student-dashboard/books` — My Books (books/page.tsx)
- `/student-dashboard/subjects` — My Subjects (subjects/page.tsx)
- `/student-dashboard/subjects/[sectionSubjectId]` — Subject detail with book and resources
- `/student-dashboard/assessments` — Assessments list (assessments/page.tsx)
- `/student-dashboard/assessment-attempts/[attemptId]` — Active attempt player
- `/student-dashboard/assessment-attempts/[attemptId]/result` — Submitted result view
- `/student-dashboard/gaps` — Learning Gaps (gaps/page.tsx)
- `/student-dashboard/reports` — Progress Reports (reports/page.tsx)
- `/student-dashboard/profile` — Profile (profile/page.tsx)
- `/student-dashboard/remedials` — Remedial Learning (remedials/page.tsx)
- `/student-dashboard/practice/[attemptId]` — Practice (practice/[attemptId])
- `/student-dashboard/ai` — AI Learning Assistant (referenced in nav, route not yet reviewed)

### Excluded Routes (Not Yet Implemented)
- Homework
- Attendance
- Timetable
- Notifications
- Report Card

## Navigation Review

**File:** `components/student/StudentNavigation.tsx`

Current state:
- Desktop sidebar: present
- Mobile horizontal scroll nav: present
- Links: 12 items including AI and Practice
- Items lack feature-control gating — all routes render regardless of entitlements
- `Learning Resources` link duplicates `/student-dashboard/subjects`

### Issues
1. **No feature gating**: All routes render even if entitlement is `LOCKED`, `FEATURE_DISABLED`, or route does not exist (e.g., AI).
2. **Duplicate navigation**: `Learning Resources` and `My Subjects` both point to `/student-dashboard/subjects`.
3. **Mobile nav is dense**: 12 horizontal items scroll; no grouping or collapsible sections.

## Authorization & Identity

**File:** `lib/student-dashboard.ts`

Uses `requireStudent()` (cached) that:
- Validates session role is `STUDENT`
- Loads full identity via `loadStudentIdentity`
- Verifies session claims match identity (studentId, schoolId, publisherId, academicYearId)

**File:** `lib/student-identity-service.ts`

Resolves:
- Student record with school and publisher
- Current active enrollment within active academic year
- Effective plan via entitlement grants

### Observations
- All reviewed routes correctly call `requireStudent()` at the top of Server Components.
- Identity scoping is strict: school, publisher, academic year, class, section.
- `identity.enrollment` and `identity.academicYear` are trusted pre-computed values from the identity service.

## Entitlement & Scope Validation

### Plan Resolution
**File:** `lib/entitlements/student-plan.ts` + `lib/entitlements/student-plan-policy.ts`

- Queries `StudentAccessGrant` filtered by student, academic year, active, time-bounded.
- Policy resolves strongest grant by plan strength then source strength.
- Default fallback: `SCHOOL_BASIC`.

### Feature Decisions
- Assessments page uses `getPremiumFeatureEntitlementForAuthenticatedUser` with `feature: "ASSESSMENTS"`.
- Gaps and Reports pages appear to rely on internal feature flags / platform configuration (states include `LOCKED`, `FEATURE_DISABLED`).
- Books and Subjects do not appear to gate on premium — they show scoped content regardless of plan.

## Data Access Policy Review

### Books (`lib/student-books.ts`)
- `getStudentBooks` fetches subjects, maps book IDs from approved adoptions, loads progress.
- Scoped by section → active class, academic year, publisher.
- `getStudentBook` additionally verifies book entitlement via `getBookEntitlementForAuthenticatedUser` (section + sectionSubjectId scoped).
- Mutations (`saveStudentReadingProgress`, `toggleStudentBookBookmark`) verify trusted context and book entitlement.

**Issue:** `getStudentBooks` does not verify per-book entitlement before building the library — `getStudentBook` does. The library relies on adoption scope but could surface books a student should not access if adoption data is inconsistent.

### Subjects (`lib/student-subjects.ts`)
- Queries `sectionSubject` filtered by section, active class, academic year.
- Joins approved book adoptions (school, publisher, academic year, class, section) and published resources with student audience.
- Joins teacher assignments (subject teachers only).
- Policy (`student-subject-policy.ts`) normalizes class names, filters resources by class/subject match.

**Good:** Strong scope enforcement via normalized class/subject matching and adoption status.

### Assessments (`lib/student-assessments.ts`)
- `getStudentAssessments` checks premium feature entitlement first.
- Then loads assessments filtered by publisher, school, academic year, section, `PUBLISHED` status, and book in student's library.
- Validates `sectionSubjectId` integrity in memory.
- `resolveAssessmentScope` re-verifies entitlement at attempt start.

### Reports (`lib/analytics-reports.ts`)
- Not yet reviewed deeply; page references `getStudentAnalyticsReport`.
- Supports states: `READY`, `LOCKED`, `FEATURE_DISABLED` (implied from page.tsx).

### Gaps (`lib/gaps/student.ts`)
- Not yet reviewed deeply; page references `getStudentGaps`.
- Supports states: `READY`, `LOCKED`, `FEATURE_DISABLED`.

### Practice & Remedials
- Practice route exists but content not fully reviewed.
- Remedials page and actions file exist.

## Empty / Loading States Summary

| Route | Loading | Empty / Locked |
|---|---|---|
| Overview | None (server component) | Truthful per section (books, subjects, revisions) |
| Books | None | "No approved books are available yet." |
| Subjects | None | "No subjects are available yet." |
| Assessments | None | Handles LOCKED, FEATURE_DISABLED, UNAVAILABLE, empty list |
| Gaps | None | Locked / Feature disabled / Insufficient evidence / No gaps |
| Reports | None | Locked / Feature disabled / Empty analytics |
| Profile | None | Always shows current identity |
| Remedials | None | Not reviewed |
| Practice | None | Not reviewed |

**Issue:** No route uses Suspense or streaming. All data loads in parallel within the Server Component. If `getStudentBooks` or `getStudentSubjects` slows down, the entire page waits.

## Dead or Misleading Controls

1. **Navigation link `Learning Resources`** is redundant — same target as `My Subjects`.
2. **Dashboard "Continue Learning" button** is disabled when no books exist; could instead link to Subjects.
3. **Revision Completed section on Overview** links to `/student-dashboard/books/[bookId]/chapters/.../revision` — chapter routes may not be fully implemented in this phase.
4. ** AI route** is present in navigation but route was not discovered during listing; likely missing or dead.

## Mobile Navigation

- Horizontal scroll nav renders all 12 links on mobile regardless of feature availability.
- No hamburger / collapsible behavior.
- Touch targets are OK (py-3), but density is high.

## Recommended Stabilization Plan

### Phase 1A — Navigation & Structure
1. **Feature-gate navigation items**
   - Introduce a helper `useStudentFeatureFlags` (server component friendly) that returns enabled features.
   - Conditionally render nav items based on plan + platform features.
   - Hide: AI unless feature enabled, Practice unless feature enabled, etc.
2. **Remove duplicate nav item**
   - Delete `Learning Resources` from `baseItems` in `StudentNavigation.tsx`.
3. **Improve mobile nav**
   - Replace horizontal scroll with a collapsible bottom-bar or segmented control.
   - Group by category: Learning, Assessment, Support, Profile.

### Phase 1B — Data Safety & Query Bounding
1. **Books library entitlement check**
   - In `getStudentBooks`, intersect subject book IDs with approved adoptions that pass `getBookEntitlementForAuthenticatedUser` or replicate adoption criteria exactly.
2. **Add bounded queries**
   - Add `.take(100)` to all unbounded queries (subjects, resources, assessments).
3. **Add loading skeletons**
   - Wrap slow queries in `<Suspense>` with simple skeleton placeholders. Start with Books and Subjects lists.
4. **Truthful empty states**
   - Ensure every route distinguishes between: no data, feature disabled, feature locked, and error states.

### Phase 1C — UX Integration
1. **Overview coherence**
   - Ensure Overview sections reflect real data and link to working destinations.
   - Remove Revision Completed section unless chapter revision routes are verified.
2. **Assessment flow validation**
   - Verify start → attempt → result → back-to-assessments links are coherent.
3. **Profile enrichment**
   - Add plan/branding context if needed.

### Phase 1D — Tests
1. **Student identity tests** — already exist (`tests/student-identity-integration.test.ts`).
2. **Plan resolution tests** — add unit tests for `resolveEffectiveStudentPlan` priority logic.
3. **Subject policy tests** — add tests for `buildStudentSubjectViewModels` filtering/normalization.
4. **Assessment summary tests** — add tests for `calculateAssessmentSummary` edge cases.
5. **Navigation component tests** — snapshot tests for feature-gated rendering.

## Proposed File Changes

| File | Change |
|---|---|
| `components/student/StudentNavigation.tsx` | Gate items; remove duplicate; improve mobile |
| `app/student-dashboard/page.tsx` | Remove Revision Completed if chapter routes missing; add Suspense |
| `lib/student-books.ts` | Add entitlement intersection |
| `lib/student-subjects.ts` | Confirm `.take()` limits |
| `lib/student-assessments.ts` | Confirm `.take(100)` already present |
| `lib/student-subject-policy.ts` | Add unit tests |
| `lib/entitlements/student-plan-policy.ts` | Add unit tests |
| `lib/analytics-reports.ts` | Review state handling |
| `lib/gaps/student.ts` | Review state handling |

## Out of Scope (Deferred)
- Homework, Attendance, Timetable, Notifications, Report Card routes
- Prisma schema or migration changes
- New feature implementation beyond stabilization