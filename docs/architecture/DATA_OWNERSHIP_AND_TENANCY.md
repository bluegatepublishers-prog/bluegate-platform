# Data Ownership and Tenancy

“Current” describes schema v1 inspected on 12 July 2026. Future models are marked **Planned**. Deletion defaults are architectural targets and remain subject to approved retention/privacy policy. Tenant-owned tables should index `publisherId` with common scope/filter columns; all cross-model IDs must be checked for the same publisher and, where applicable, school/year.

| Model | Current owner | Target owner / scope | History and deletion | Index / migration / risk |
|---|---|---|---|---|
| User | Platform-global identity; unique email | Platform identity plus publisher/school memberships | Disable rather than delete while referenced; redact under approved process | Membership indexes; email policy unresolved. High risk if role alone grants tenancy. |
| Publisher | **Planned** | Platform root tenant | Suspend, never cascade-delete operating data | Unique verified key/domain; seed Bluegate first. Critical root. |
| School | Current standalone account | Publisher-owned; school scope | Suspend/archive; preserve academics | `(publisherId, status/name)`; nullable/backfill/require. Critical. |
| Teacher | School optional today | Publisher-resolved school membership; assignment scope | Deactivate/end membership; retain assignments | `(publisherId, schoolId, active)`; legacy free-text school fields transitional. High. |
| Student | School-owned today | Publisher via required school; school scope | Deactivate; preserve annual records; controlled erasure | `(publisherId, schoolId, admissionNumber)` unique; backfill via school. Critical. |
| AcademicYear | School | Publisher via school; school/year | Preserve; deactivate; restrict destructive deletion | Current `(schoolId,name)` good; current-year partial unique target. High. |
| SchoolClass | School/year | Publisher via school; school/year | Preserve annual instance; deactivate | Validate school matches year; tenant/year indexes. High. |
| ClassSection | Class | Inherits publisher/school/year through class | Preserve; deactivate | Class/code unique; denormalized tenant key only if justified. Medium. |
| SectionSubject | Section plus global Subject; optional Book | School/year context consuming publisher content | Deactivate; preserve links | Index tenant/school/year and book; validate book-sharing policy. High. |
| TeacherAssignment | School/year | Publisher/school/year and teacher membership | End/deactivate; never rewrite history | Partial unique active class/subject teacher; cross-school validation. Critical. |
| StudentEnrollment | Student and school/year | Publisher/school/year | Status/end date; preserve promotion/transfer | Existing annual uniqueness; tenant scope and same-school validation. Critical. |
| Book | Currently platform/Bluegate content | Publisher-owned | Archive/unpublish; retain adoption/history | `(publisherId,slug)` unique; backfill Bluegate. Critical public leakage risk. |
| Chapter | Book | Inherits publisher from Book | Version/review changes; retain published evidence | `(bookId,chapterNumber/slug)` current; tenant derived. High AI-grounding risk. |
| Resource | Currently global | Publisher-owned; optional school/subject links; explicit audience | Archive/unpublish; clean protected object by policy | Publisher/audience/published indexes; default legacy audience teacher-only. Critical. |
| SchoolBookAdoption | School/year/book | Shared publisher-to-school approval | Append decision state/timestamps; never delete routine history | Add tenant and uniqueness/idempotency rule; existing scope indexes. Critical. |
| Download | Teacher activity | Publisher/school/teacher scoped | Retain per analytics/privacy policy; purge safely | `(teacherId,downloadedAt)`, tenant if reporting. URL must not be logged. Medium. |
| Bookmark | Teacher preference | Publisher/teacher scoped | User-removable; cascade only with approved identity deletion | Unique `(teacherId,resourceId)` target; tenant derived. Medium. |
| AI generations | Teacher-owned today | Publisher/school/teacher; content-entitlement context | Retain prompts/outputs per policy; redact sensitive data | Tenant/teacher/time/status; snapshot grounding/version. High. |
| AI quota (`AiUsage`) | Teacher plan/usage | Publisher and beneficiary scoped quota ledger | Immutable consumption; expire/release reservations | Existing teacher/status/time indexes plus tenant; concurrency lock remains. High. |
| Subscription | **Planned** | Publisher commercial product; school/student beneficiary | Append lifecycle; cancellation, not deletion | Tenant/beneficiary/status/dates, idempotency key; payer policy unresolved. Critical. |
| TutorAssignment | **Planned** | Publisher/school relationship linking tutor/student | Date-bound, revoke; preserve audit/consent | Tenant/tutor/student/active dates; no implicit school access. Critical. |
| Assessment | **Planned** | School/teacher academic context under publisher | Version published assessments; retain attempts | Tenant/school/year/section/status; strong answer isolation. Critical. |
| Assignment | **Planned** | School/teacher academic context under publisher | Archive, retain submissions and grading history | Tenant/school/year/section/due date; recipient indexes. High. |
| Remedial | **Planned** | Student evidence context; assigned by teacher/tutor | Preserve recommendation, reviewer and outcome versions | Tenant/student/status/evidence; audience/entitlement checks. High. |

## Ownership rules

```text
Platform identity
  └─ Publisher membership → Publisher tenant
       ├─ Publisher content (Book, Chapter, Resource)
       └─ School → annual academic graph → assignments/enrollments
```

- A redundant `publisherId` is useful on high-volume/security-critical tables for scoping and indexing, but it must be written from canonical server relations and checked for consistency.
- Platform-owned reference catalogs must be explicitly declared; absence of a tenant key is not enough to imply platform ownership.
- School-owned records cannot be moved across publishers by editing an ID. Movement is a governed migration with conflict and history handling.
- Cross-publisher sharing, multi-publisher schools, and multi-network teachers remain unresolved. Until approved, default deny.
- Hard delete is reserved for safe transient/unreferenced data or an approved privacy workflow. Academic, approval, subscription, permission, and support events use append-only or soft-deactivation semantics.

## Migration controls

Seed Bluegate in a deterministic migration/controlled script; add nullable keys; backfill from canonical parents in batches; report nulls and conflicts; deploy scoped code; add tenant-aware indexes/unique constraints; then enforce non-null. Validate counts and representative relations before/after. Never use browser-provided tenant IDs, cascading cross-tenant cleanup, or production reset.
