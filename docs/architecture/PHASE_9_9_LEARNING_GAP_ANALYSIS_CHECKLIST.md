# Phase 9.9 Learning Gap Analysis Checklist

Status: implementation complete in the worktree; migration pending and feature disabled by default.

## Scope and invariants

- [x] Detection consumes Phase 9.8 `StudentAnalytics`, `StudentSubjectAnalytics`, `StudentChapterAnalytics`, and `StudentSkillAnalytics` only.
- [x] Gap pages read stored projections; they never inspect raw attempts, answers, questions, prompts, or AI conversation text.
- [x] A gap is an educational support signal, not a diagnosis, fixed-ability label, prediction, ranking, or remedial assignment.
- [x] Publisher, school, student, academic year, and teacher assignment scope are derived on the server.
- [x] `GAP_ANALYSIS` is marked implemented by the pending migration but no `PublisherFeature` is inserted or enabled.

## Versioned policy (`BG-GAP-1.0`)

The centralized policy in `lib/gaps/policy.ts` uses a small deterministic rule set:

- At least two scored events are required, or one formal assessment must cover at least three scored mapped questions.
- 80–100 is clear. A 60–79 LOW signal requires repeated (three) or mixed scored evidence. 40–59 is MODERATE. Below 40 is HIGH.
- CRITICAL requires an average below 30, at least three scored items, and evidence observed in the last 90 days.
- The internal 0–100 score is `100 - weightedAverage + min(10, 2 × evidenceBeyondTwo)`, bounded at 100. It is a coarse deterministic ordering aid and is never shown to students.
- Practice and assessment are weighted by their scored counts. Reading, revision, and AI usage can explain context only and can never create a gap.
- Defaults are versioned implementation policy, not permanent pedagogical truth.

Pending subjective assessment events are stored as `LearningTimeline.provisional` and excluded from assessment averages. Only non-pending, scored response mappings contribute to learning-outcome and competency aggregates.

## Vocabulary and dimensions

- Dimensions: subject, book, chapter, learning outcome, competency.
- Severity: low, moderate, high, critical. Student wording is respectively “A little more practice”, “Needs attention”, “Needs focused practice”, and “Teacher support recommended”.
- Status: open, acknowledged, resolved, dismissed.
- Evidence: practice, assessment, reading, revision, AI support, mixed.
- Source: system rule, teacher confirmed, tutor confirmed, future manual.

## Storage, evidence, and history

- `GapAnalysisRun` records a versioned student/year run and has a unique fingerprint of the input analytics rows and timestamps.
- `StudentLearningGap.activeKey` is unique while a matching occurrence is active. It becomes null when closed, preserving the occurrence.
- A later recurrence requires additional scored evidence beyond the prior baseline and creates a new historical row.
- `StudentLearningGapEvidence` stores safe metric values, thresholds, sample sizes, observation time, and source aggregate identity. It stores no raw response, question, prompt, or AI text.
- Evidence rows are append-only per run. Teacher review appends `StudentLearningGapReview`; it never changes evidence, marks, or analytics.
- Restrictive foreign keys and tenant/year/status/dimension indexes preserve academic ownership and bounded reads.

## Recovery and review

- Automatic resolution requires a current weighted average of at least 75 and at least two new scored events beyond the gap baseline. One improved result is insufficient.
- Teachers can acknowledge, dismiss, resolve, or explicitly recompute only after current assignment scope is revalidated from the session.
- Dismiss and resolve require a normalized 5–500 character reason. Reviewer identity is server-derived.
- Students, schools, and publisher admins have no review mutation path in this phase.
- The append-only gap review is the Phase 9.9 audit record. A platform-wide `AuditEvent` expansion remains future hardening.

## Triggers and failure boundary

Successful reading completion, revision completion, practice submission, assessment finalization, and contextual student-assistant analytics invoke best-effort recomputation only after their source/analytics transaction commits. An explicit teacher refresh is also available. A gap failure logs a generic retry-required event and cannot roll back the learning action. Stable run and active keys make retries safe.

## Role surfaces

- Student: own current-year gaps, premium plus publisher feature, friendly evidence without thresholds, policy versions, scores, or IDs.
- Teacher: active class-teacher section scope or exact subject-teacher subject/section scope; filters, assigned learners, patterns, detail, and review actions.
- School: current-school, current-year read-only class, section, severity, status, learning-area, and learner-support aggregates.
- Publisher Admin: tenant-wide aggregate book/chapter/skill/severity/status/trend patterns; no student identities.
- Existing reports show stored open counts and links only when `GAP_ANALYSIS` is enabled. Report reads never recompute.

## Historical backfill

The controlled script reads `StudentAnalytics` only, requires explicit publisher and academic-year scope, supports a 1–500 page size, a stable ID cursor, dry run, result counts, and resumption. It delegates to the same idempotent detector and does not enable the feature.

Dry-run example (do not omit tenant/year):

```powershell
npm run gaps:backfill -- --publisher=<publisher-id> --academic-year=<year-id> --limit=100 --dry-run
```

After reviewing the dry-run, an authorized operator may remove `--dry-run`; use the returned `nextCursor` as `--cursor=<id>`. The script was not executed during Phase 9.9.

## Manual test checklist

- [ ] Enable the pending feature for a non-production test publisher through the approved feature-management path.
- [ ] Confirm School Basic sees the Premium state and eligible premium plans can enter only when the publisher feature is enabled.
- [ ] Submit two/repeated scored events and confirm one explainable active gap, not duplicates.
- [ ] Confirm a single low result, reading incompletion, revision incompletion, or AI usage alone creates no gap.
- [ ] Confirm pending subjective work does not depress the aggregate or create a gap.
- [ ] Copy student and teacher gap URLs across users, sections, subjects, schools, and publishers; confirm denial/not-found.
- [ ] Confirm teacher acknowledge, dismiss, resolve, reason bounds, history, and explicit refresh.
- [ ] Confirm school and publisher pages are read-only and publisher rows contain no student names.
- [ ] Confirm report counts match stored OPEN plus ACKNOWLEDGED rows and opening a report creates no run.
- [ ] Close a gap, add sufficient later weak evidence, and confirm history plus a new recurrence.
- [ ] Add two recovery events averaging at least 75 and confirm conservative automatic resolution.

## Deployment checklist

- [ ] Review migration SQL for additive-only DDL, enum creation, restrictive foreign keys, and indexes.
- [ ] Back up and test the migration on a disposable branch/database using the approved release process.
- [ ] Apply migration separately; do not run the seed or backfill automatically.
- [ ] Deploy code with `GAP_ANALYSIS` disabled for all publishers.
- [ ] Verify existing Phase 9.8 analytics reconciliation, especially provisional assessments and subject-scoped skills.
- [ ] Run a tenant/year dry-run, inspect counts, then resume controlled pages only after approval.
- [ ] Enable the feature per publisher only after entitlement, scope-denial, wording, and support review.
- [ ] Monitor generic recomputation failures without logging student identifiers or learning content.
- [ ] Roll back access by disabling the feature; preserve additive historical records.

## Phase 9.10 integration boundary

Future remedials may reference an active gap and approved entitled content after a reviewed policy is accepted. Phase 9.10 must add its own review, assignment, reassessment, and authorization lifecycle. Phase 9.9 neither recommends nor assigns an intervention automatically.
