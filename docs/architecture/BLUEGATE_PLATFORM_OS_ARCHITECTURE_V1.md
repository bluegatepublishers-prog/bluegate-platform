# Bluegate Platform OS Architecture Specification

## 1. Document control

| Field | Value |
|---|---|
| Document | Bluegate Platform OS Architecture Specification |
| Version | 1.1 |
| Status | Approved Architecture Baseline |
| Platform | Bluegate Platform OS |
| Initial tenant | Bluegate Publishers |
| Date | 13 July 2026 |
| Purpose | Govern product, data, security, API, migration, UI, and deployment decisions |
| Audience | Business owners, product, engineering, operations, and implementation agents |

Changes require approval, an updated version, and a record in `PLATFORM_DECISION_LOG.md`. This baseline distinguishes **Current**, **Approved target**, and **Roadmap**; target language is not a claim of implementation.

## 2. Executive summary

Bluegate Platform OS is a white-label Education Operating System through which multiple educational publishers can operate branded platforms for schools, teachers, students, tutors, and parents from one secure codebase. Bluegate Publishers is the initial publisher tenant. The public publishing website may remain Bluegate-specific while authenticated portals become themeable. Branding changes configuration, not application copies. Publisher, school, assignment, enrollment, entitlement, and audience boundaries isolate authenticated data.

## 3. Product vision

> One Platform. Unlimited Publishers. Unlimited Schools. Unlimited Learning.

The product layers are Super Admin Platform, Publisher Portal, School ERP, Teacher Workspace, Student Learning Platform, Tutor Platform, Parent Portal, and shared AI and Analytics Services.

## 4. Current implementation status

Evidence reviewed includes the Prisma schema and migrations; `auth.ts`, `auth.config.ts`, `proxy.ts`; dashboard pages/actions; route handlers; authorization, academic, adoption, book, teacher/school dashboard libraries; storage adapters; and AI runtime/provider/quota code.

| Area | Status | Code evidence / boundary |
|---|---|---|
| Public website | Complete | Home, books/detail, blog, contact, school and teacher marketing routes exist. |
| Admin CMS | Partially implemented | Books, chapters/knowledge/questions/activities, resources, schools, teachers, inspection requests, adoption, and AI screens; no tenant/staff portal. |
| Teacher Dashboard | Partially implemented | Resources, downloads/bookmarks, profile, AI Studio/history/builders; assignments/assessment/student workflows absent. |
| School Dashboard | Partially implemented | Profile, teachers, academic years/classes/sections/subjects, assignments, students/enrollments, resources, inspection and adoption. |
| Authentication | Partially implemented | Credentials/JWT for `ADMIN`, `TEACHER`, `SCHOOL`; role redirects and reset UI. Student model can link a user but no student login route/dashboard. |
| Academic Engine | Partially implemented | School/year/class/section/subject, teacher assignment, student enrollment and server scoping exist. Attendance/timetable/calendar absent. |
| Book knowledge | Partially implemented | Chapters, reviewed text, approval, outcomes, questions, activities, summaries and keywords exist. |
| Book approval | Complete | Annual scoped request/review/revoke data and school/admin workflows exist. `EXPIRED` is a schema status, not demonstrated automation. |
| Preview/full-book separation | Partially implemented | Separate fields and protected route exist; storage uses public Vercel Blob URLs, so private-object target is unmet. |
| AI Studio | Partially implemented | Teacher question-paper preparation/generation/history and admin provider test; other engines are future. |
| OpenAI provider | Complete | Server-only provider plus readiness/error handling; fake provider also exists. |
| Storage | Partially implemented | Local and Vercel Blob adapters, authenticated direct uploads, managed paths/type/size policy and cleanup; tenant prefixes/private objects absent. |
| Student foundation | Implemented | Student authentication, current enrollment resolution, annual academic context, computed book entitlement, and premium access grants exist. |
| Student Dashboard | Partially implemented | My Subjects, My Books, student-facing learning resources, protected reading, reading progress/bookmarks, Revision Hub, and premium Practice Engine exist; Student Learning Assistant and later assessment/analytics phases remain planned. |
| Subscription system | Not started | Teacher AI plan/quota is a narrow entitlement, not a subscription engine. |
| Tutor / Parent | Not started | No roles, models, routes, or relationships. |
| Multi-publisher tenancy | Not started | No `Publisher`, membership, branding, feature, or tenant key models. Bluegate-specific fields remain. |

## 5. Architectural principles

1. One codebase serves multiple publishers; Bluegate is the default initial publisher.
2. Every tenant-owned business record resolves to one Publisher; cross-publisher access is forbidden.
3. Students always belong to a school, while yearly placement uses `StudentEnrollment` and preserves history.
4. Book approval is annual. Adoption, user entitlement, and premium subscription are separate decisions.
5. Public preview and protected full book are separate files; teacher-only resources never appear to students.
6. AI uses approved, grounded, entitled content only.
7. Browser ownership IDs are never trusted; the server resolves identity and ownership.
8. No feature bypasses tenant, school, academic-year, assignment/enrollment, audience, entitlement, subscription, or feature checks.
9. Interfaces remain plain and simple for non-technical users.
10. Feature access is configurable and server-authorized; hidden navigation is not security.
11. Prefer additive migrations and historical deactivation; never reset production.
12. Sensitive approvals, permission changes, and support access are auditable.

## 6. Platform hierarchy

```text
Platform
└─ Publisher
   ├─ Publisher Admin and Staff
   └─ School
      └─ Academic Year → Class → Section → Subject
         ├─ Teacher Assignments
         └─ Student Enrollments
```

Future relationships add tutors, parents, school subscriptions, and student subscriptions. Individually paid premium never detaches a student from their school.

## 7. User roles

Target roles are `SUPER_ADMIN`, `PUBLISHER_ADMIN`, `PUBLISHER_STAFF`, `SCHOOL`, `TEACHER`, `STUDENT`, `TUTOR`, and `PARENT`. Current `UserRole` contains `ADMIN`, `TEACHER`, `SCHOOL`, `STUDENT`. Initially map existing `ADMIN` accounts to Bluegate Publisher Admin in authorization code. Add memberships and new roles additively, migrate sessions/routes, then consider an enum rename after compatibility and rollback review.

## 8–15. Role responsibilities

### Super Admin

Creates/activates/suspends publishers; manages platform plans, feature releases, quotas, domains, announcements, health, and cross-tenant operational aggregates. Tenant support entry is explicit and audited. Super Admin must not silently edit academic records.

### Publisher Admin

Within one publisher: manages books, approved knowledge, resources, schools, annual adoption, staff, branding, modules, AI configuration, reports, subscription products, and revocation. It can never see another publisher.

### Publisher Staff

Academic, Content, Sales, Digital, Support, Finance, and Operations are permission profiles, not new global super-roles. Planned concepts are `Permission`, `RoleTemplate`, `PublisherStaffMembership`, and `StaffPermissionAssignment`.

### School

From authenticated school context, manages academic years, classes, sections, subjects, teachers, students, assignments/enrollments, adoption requests, school subscriptions, and reports. Attendance, timetable, and calendar are future.

### Teacher

Sees assigned classes/subjects/students; entitled full books; teacher/shared resources; and may create future homework, assignments and assessments, generate grounded AI material, review results/gaps, and approve remedials. Access requires active school link and assignment; book-specific work also requires annual approval. One teacher may simultaneously hold multiple class- and subject-teacher assignments.

### Student

Access types are School Basic, School Premium, Individual Premium, and Individual Premium with Mentor. All eligible enrolled students may open an approved full book; public-sample rules do not apply. Basic can include approved books, basic videos/PPTs/worksheets, subject information, and notifications. Premium can include homework, assignments, quizzes, assessments, results, progress/gaps/remedials, AI, and tutor support. Book and premium checks remain separate.

### Tutor

Planned types: publisher tutor, private tutor, and a school teacher acting under a separate tutor assignment. Active `TutorAssignment` permits only assigned students and allowed progress, practice, remedial, feedback, and mentoring functions—never automatic school-wide access.

### Parent

Future validated guardian links support multiple children and guardians. Parents may see linked-child progress, subscriptions, alerts, tutor communication, payments/renewals, and approve optional services.

## 16. Multi-tenant architecture

`Publisher` is the target tenant root for memberships, schools, books, resources, AI settings, branding, feature flags, and products. Resolve it from authenticated membership, verified custom domain/subdomain, or explicit audited Super Admin route context. Never accept browser form ownership as authority. Every repository/query must receive or derive server publisher context; composite uniqueness and indexes include `publisherId` where business uniqueness is tenant-local.

## 17. White-label branding

Planned configuration includes name/short name, logo/favicon, primary/secondary/accent colors, support email/phone, footer, legal links, AI assistant name, email sender, login branding, custom domain, and portal title. Sanitize theme values and verify domains. The Bluegate public website need not be generalized initially; authenticated portals should use a resolved theme.

## 18. Feature catalog

Publisher-configurable modules: AI Studio, Book Approval, Resources, Homework, Assignments, Assessments, Attendance, Timetable, Calendar, Reports, Gap Analysis, Remedials, Tutor Platform, Parent Portal, Student AI, Discussion Rooms, and Notifications. Planned `FeatureDefinition`, `PublisherFeature`, and `PlanFeature` separate global catalog, tenant enablement, and commercial packaging. Every mutation/read checks features server-side.

## 19. Academic engine

Current hierarchy is `School → AcademicYear → SchoolClass → ClassSection → SectionSubject`, with `TeacherAssignment` and `StudentEnrollment`. `Student` stays class-neutral. One current year per school must be transactionally enforced (the current schema index is not unique). One active class teacher per section and one active subject teacher per section-subject require application checks now and preferably partial unique indexes later. Assignments may be many per teacher; deactivation preserves history; all referenced records must resolve to the same school/year.

## 20. Content engine

Publisher master content comprises books, global class/subject/series, chapters, extracted/reviewed text, outcomes, questions, activities, summaries, keywords, AI readiness, and resources. Schools consume approved content; they do not own it. Future tenant keys must prevent identical slugs/codes from becoming globally coupled unless intentionally platform-owned.

## 21. Public preview and full book

```text
Public query → explicit select → publicPreviewPdf → selected pages
Entitled session → protected route → authorization → fullBookPdf/signed URL
```

Full-book locations must never enter public props/APIs. The current route checks authenticated roles and adoption/assignment context, but public Vercel Blob storage means a disclosed URL remains public. Target private objects and short-lived signed URLs; log sensitive access without logging URLs.

## 22–24. Adoption, entitlement, and audience

Annual adoption flows `School selects → requests → Publisher reviews → one-year approval → new-year request`. Statuses are `PENDING`, `APPROVED`, `REJECTED`, `REVOKED`, `EXPIRED`; preserve all decisions. Adoption asks “may this school officially use the book?” and does not enable premium learning.

Book entitlement asks “may this user open it?” Sources include enrollment, teacher assignment, school/admin role, and future tutor assignment. Compute it initially from canonical relations; persist only for licensing exceptions, audit, or performance.

Add explicit resource audience `TEACHER_ONLY`, `STUDENT`, `BOTH`. Answer keys, guides, lesson plans and marking schemes are teacher-only; student videos, PPTs, worksheets and practice may be student; selected references may be both. Resource type never implies audience.

## 25. Subscription engine

Planned subscription products and activations distinguish payer (publisher/school/guardian/student as approved), beneficiary, plan, source, dates, status, and feature grants. School Basic, School Premium, Individual Premium, and Individual Premium with Mentor can coexist under deterministic precedence. Cancellation ends premium grants but not school membership or valid adopted-book access. Payment gateway design is outside v1.

## 26–30. Learning engines

Homework/assignments support instructions, attachments, due dates, submissions, marks, feedback, lateness, resubmission, outcomes, and competencies. Question banks and assessments support attempts, responses, marks, feedback, mappings, and reassessment; correct answers remain hidden before submission.

```text
Assessment → Question → Outcome → Competency → Performance
→ Gap → Recommended Remedial → Teacher/Tutor review
→ Student practice → Reassessment
```

Student explanations are encouraging; teachers/tutors receive deeper analytics. Remedials may be explanations, video, worked examples, PPTs, worksheets, questions, quizzes, tutor notes, or reassessment. The system recommends; a teacher/tutor reviews; practice occurs; reassessment measures improvement.

## 31. AI architecture

Current provider-neutral flow is Knowledge Collector → Prompt Builder → Preparation Validator → Quota Reservation → Fake/OpenAI provider → Response Validator → Persistence → Quota Consumption. Calls are server-only; secrets never reach clients. Only reviewed/approved book knowledge is eligible. Failures release reservations; provider success alone does not consume quota—validated persisted output does. Future providers implement the same contract.

### Bluegate Student Learning Assistant

Bluegate Student AI is a guided learning assistant, not a general chatbot. It offers a fixed learning-tool interface rather than an unrestricted blank conversation. Every request is grounded through this server-authorized chain:

```text
Publisher
→ School
→ Student
→ Academic Year
→ Entitled Approved Book
→ Approved Chapter
→ Approved Structured Knowledge
→ AI
```

The assistant may use only the exact approved chapter knowledge collected for the authenticated student's current, entitled context. It never combines books or unrelated chapters, crosses publishers, searches the internet, or supplements missing material with generic model knowledge. If the approved context cannot support a request, it refuses with a simple chapter-scoped message rather than improvising.

Approved initial modes are:

- Explain Concept
- Simplify Topic
- Real Life Example
- Revision
- Vocabulary
- Ask Me Questions
- Doubt Solver
- Explain in Hindi

Only Doubt Solver accepts bounded free text. Other modes use structured inputs derived from the selected chapter. Language is an extensible mode parameter so additional publisher-approved languages can be introduced without changing the authorization or grounding model.

Conversation memory is scoped to publisher, school, student, academic year, book, and chapter. Changing the chapter starts a new conversation. There is no global student AI memory and no cross-book or cross-year continuation. Persisted history contains only the student question or selected mode, validated answer, timestamp, and authorized ownership/context references; hidden prompts, system instructions, provider payloads, model names, API details, grounding internals, source locations, and storage URLs are not stored in student-visible history.

Student AI enforces the same identity, enrollment, adoption, book entitlement, publisher feature, and premium checks on every request and history read. `SCHOOL_BASIC` is locked. `SCHOOL_PREMIUM`, `INDIVIDUAL_PREMIUM`, and `INDIVIDUAL_PREMIUM_MENTOR` may use it only while the publisher Student AI feature is enabled. Teacher AI generation quota and Student AI learning quota are independent systems. Student quotas are publisher-controlled daily and/or monthly learning limits and never consume or reveal Teacher AI quota.

Safety policy rejects politics, religion, coding help, medical or other unrelated advice, internet search, other publishers, other books, and attempts to reveal system prompts, providers, models, APIs, internal IDs, grounding implementation, knowledge-source metadata, or storage URLs. Responses remain age- and class-appropriate, use short clear explanations, and prefer examples already supported by approved content. Voice AI, Image AI, Homework AI, and Whiteboard AI may later implement the same scoped grounding, entitlement, quota, validation, and persistence contracts; their mention is compatibility guidance, not implementation approval.

## 32. Storage architecture

Current authenticated cloud/local uploads enforce scope, path, extension/MIME and size limits and clean managed replacements. Target paths are publisher-prefixed and then grouped under schools, books, resources, logos, and protected content. Server must construct ownership paths. Public previews may be public; full books/internal resources use private objects, short-lived signed URLs, authorization at issuance, and replacement cleanup.

## 33–34. Authentication and authorization

Current routes include admin, teacher, and school login; `STUDENT` exists only as identity foundation. Future routes add student, Super Admin, Publisher Admin, tutor, and parent. Authentication proves identity; authorization evaluates, in order: role, publisher, school, academic context, assignment/enrollment, book approval/entitlement, resource audience, subscription, feature flag, and tutor/parent relation. Each sensitive server action and route handler repeats these checks and returns safe errors.

## 35. Audit logging

Add append-only `AuditEvent` for publisher creation/suspension, staff permissions, adoption approval/revocation, subscription activation/cancellation, tutor assignment, support access, exports, and role changes. Record actor, effective tenant, action, target type/id, timestamp, request correlation, reason, and safe before/after metadata. Restrict viewing and retention; never store secrets or protected URLs.

## 36. Data privacy

Collect minimum necessary data; isolate tenants and schools; validate parent/tutor relationships; restrict assessment and student information; redact logs; use safe errors; and define export, correction, retention, and deletion processes. Indian-school regulatory obligations require specialist review before launch; this document makes no legal-compliance claim.

## 37. API standards

Use Server Actions for suitable authenticated dashboard mutations and Route Handlers for uploads/downloads/integrations. Derive identity server-side; validate input; use explicit Prisma selects, stable error codes, safe messages, transactions for multi-record invariants, idempotency for approvals/payments, pagination/filtering, and bounded queries. Do not return raw database errors.

## 38. Prisma and database standards

Continue current `cuid()` unless a reviewed ADR changes it. Use explicit relations, tenant-aware indexes, composite unique constraints, and reviewed PostgreSQL partial indexes for active-only invariants. Prefer additive migrations and deactivation/end dates. Never store comma-separated relationship IDs or direct class fields on students. Never reset production; review generated SQL and rehearse backfill/rollback before deployment.

## 39. UI/UX principles

Use plain language, large actions, guided steps, smart defaults, searchable selectors, progressive disclosure, mobile layouts, clear badges, useful empty states, and human names instead of raw IDs or technical jargon. Student UI is especially simple, safe, and encouraging. Accessibility and keyboard behavior are acceptance criteria.

## 40. Scalability strategy

Use tenant-aware indexes, pagination, bounded selects, structured content rather than repeated PDF parsing, asynchronous extraction, background jobs for bulk notification/reporting, safe caching keyed by authorization context, signed protected access, AI quotas, metrics, traces, and logs. Capacity claims require load tests; none are made here.

## 41. Deployment

Current stack evidenced by project configuration is GitHub, Vercel, Neon PostgreSQL, Prisma, and Vercel Blob-compatible storage. A safe release sequence is: review migration SQL/backups and rollback → `npm ci` → `npx prisma generate` → `npx prisma migrate deploy` in the controlled target → type-check/tests → `npm run build` → approved commit/push → Vercel deployment → live role/tenant smoke tests. Never use `prisma migrate reset` in production; migrations and deployment require separate authorization.

## 42. Testing strategy

Require type checking and build verification; authorization unit tests; server action/route integration tests; cross-tenant, cross-school, role-route and disabled-feature denial tests; adoption/entitlement/subscription tests; AI grounding/quota failure tests; migration/backfill tests; upload/signed-URL tests; and live smoke tests with non-production fixtures.

## 43. Migration to multi-tenancy

1. **MT-1:** add `Publisher`, seed Bluegate, add nullable `publisherId` to top-level records, backfill and reconcile.
2. **MT-2:** add publisher membership and branding; map current Admin to Bluegate Publisher Admin.
3. **MT-3:** propagate keys to remaining business records and scope every query/action, with denial tests.
4. **MT-4:** make keys required and add tenant-aware unique constraints/indexes after null/orphan checks.
5. **MT-5:** add Super Admin portal, Publisher Admin portal, and staff permissions with audit.
6. **MT-6:** add verified domains, feature catalog, and tenant-aware storage/private-object migration.

Use dual-read/dual-write only where needed, deploy schema before code that requires it, batch backfills, measure unresolved rows, and retain rollback paths. Do not change everything in one migration.

## 44. Target data ownership

Platform owns global feature definitions, platform plans/settings. Publisher owns books, resources, staff, branding, and AI settings. School owns academic structures, school memberships, students, enrollments, attendance, and school operations. Publisher books are shared through adoption. Users own preferences and their attempts; tutor notes are relationship-scoped, not freely portable personal data.

## 45. Development roadmap

The approved sequence is 8.0 tenancy → 8.1 branding/features → 8.2 staff permissions → 8.3 audience → 8.4 entitlement foundation → 9.0 Student Identity → 9.1 My Subjects → 9.2 My Books and Secure Reader → 9.3 Student Learning Resources → 9.4 Revision Hub → 9.5 Practice Engine → 9.6 Bluegate Student Learning Assistant → 9.7 Assessments → 9.8 Reports and Progress Analytics → 9.9 Gap Analysis → 9.10 Remedial Learning → 9.11 Mentor Platform → 9.12 Parent Dashboard. Each phase depends on all relevant isolation and audit controls; details are in `IMPLEMENTATION_ROADMAP.md`.

## 46. Non-goals

V1 does not immediately implement payment gateways, live video, payroll, transport, hostel management, marketplace, public white-label sites, native mobile apps, or government integrations. Each requires later discovery and an ADR.

## 47. Glossary

| Term | Meaning |
|---|---|
| Platform | Shared Bluegate OS code and platform services |
| Publisher / Tenant | Isolated organization operating branded education services |
| Super Admin | Platform operator, distinct from tenant administration |
| Publisher Admin | Administrator limited to one publisher |
| School | Academic organization under a publisher relationship |
| Academic Year | School-bounded period preserving annual history |
| Book Adoption | Annual publisher approval for school use |
| Book Entitlement | Decision that a particular user may open a book |
| Subscription | Time-bounded grant of premium features |
| Resource Audience | Explicit teacher/student/both visibility |
| Assignment | Teacher-created learning work with submissions |
| Assessment | Scored evaluation with attempts/responses |
| Learning Outcome | Observable learning goal |
| Competency | Skill grouping measured by evidence |
| Gap | Evidence-backed area requiring improvement |
| Remedial | Reviewed intervention addressing a gap |
| Tutor Assignment | Explicit, scoped tutor-to-student authority |
| Feature Flag | Server-enforced module enablement, separate from plan grants |

## Unresolved business questions

No item below is silently decided: (1) internal name Publisher or Tenant; (2) rename or temporarily map `ADMIN`; (3) staff roles, permissions, or both; (4) cross-publisher book sharing; (5) one school using multiple publishers; (6) teachers across publisher-school networks; (7) platform- versus publisher-sold subscriptions; (8) school versus publisher collection of individual payments; (9) employee and/or independent tutors; (10) parent consent for private tutors; (11) historical full-book access after year end; (12) publisher-only or school custom domains; (13) separate public-site deployments; (14) mandatory private Blob before Student Dashboard; (15) publisher-originated approval without school request.
