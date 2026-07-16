# Phase 9.12 Parent Dashboard Checklist

Status: implementation complete in the worktree; additive migration pending and `PARENT_PORTAL` disabled for Bluegate.

## Identity, relationship, and activation

- [x] `PARENT` is a distinct Auth.js role with an active `Parent` profile.
- [x] `ParentStudentRelationship` records Mother, Father, Guardian, or Other; pending, approved, rejected, and revoked lifecycles remain historical.
- [x] Authority is never inferred from email, phone, surname, address, or another contact match.
- [x] School issues a seven-day single-use random code stored only as a domain-separated hash.
- [x] Activation validates the invited email under a serializable advisory lock, creates a Parent account, consumes the invitation, and creates a non-viewable pending relationship.
- [x] Existing email accounts fail safely; account merging requires a later authenticated linking policy.
- [x] School separately approves, rejects, revokes, or marks an approved primary contact; actor and timestamps derive from the School session.

## Access and child switching

- [x] `/parent-login`, `/parent-activate`, `/parent-dashboard`, child, and report routes are present and role-isolated.
- [x] `/portal` offers Parent / Guardian Login and Activate Invitation, never open signup.
- [x] `requireParent`, `requireParentChildAccess`, `getParentChildren`, and `getParentChildLearningSummary` revalidate live state.
- [x] Every selected `studentId` is only a requested target; the server requires the exact approved relationship, active Student, approved School, active Publisher, current enrollment, and enabled `PARENT_PORTAL` feature.
- [x] Multiple approved children are displayed separately; no combined percentage is invented.
- [x] A Parent with no approved child receives an honest empty state.

## Parent-safe visibility matrix

| Area | Parent receives | Parent never receives |
|---|---|---|
| Reading/revision/practice | Stored counts, completion, averages, recent activity | Book files/URLs, question-bank rows, answers or explanations |
| Assessments | Title, completion, released score when `showScore`, safe subjective-pending state | Unreleased results, `NEVER` results, answer keys, hidden explanations |
| Reports | Stored subject summaries and consistency when Reports feature plus premium access permit | Rankings, predictions, raw analytics rows, publisher/school/teacher analytics |
| Gaps | Supportive summaries for `OPEN`/`ACKNOWLEDGED` only | Severity, score, threshold, evidence IDs, policy version, dismissed gaps |
| Remedials | Active/completed status and step counts | Reorder, complete, skip, approve, or change source gaps/content |
| Mentor | Active primary Mentor name/type/status and real completed-session count | Notes, observations, action plans, activity audit, other students |
| Student AI | Successful request/session totals, chapter count, recent-use date | Conversation, questions, answers, prompts, provider/model, quota/token data |
| Subscription | Friendly effective plan/source and real active dates | Payment, invoice, refund, renewal or checkout data |
| Notifications | Honest unavailable state | Messaging or confidential previews |

## Feature, privacy, and deployment

- [x] `PARENT_PORTAL` is marked implemented but remains outside `enabledForBluegate`.
- [x] Basic child progress does not require a Mentor plan; advanced reports narrowly retain existing Reports and premium gating.
- [x] No parent mutation exists for marks, attendance, enrollment, attempts, analytics, assessments, gaps, remedials, Mentor data, or academic records.
- [x] No messaging, payment, live meeting, email delivery, provider call, protected URL, or duplicate parent-contact field was added.
- [x] India child-data privacy, retention, consent, correction, and guardian-policy review is required before production; no legal-compliance claim is made.
- [ ] Apply `20260716120000_parent_dashboard_foundation` only through the controlled release sequence after all earlier pending migrations.
- [ ] Enable `PARENT_PORTAL` only for an explicitly approved Publisher after policy review and staging tests.

## Manual tests

1. School opens an existing Student and creates an invitation; verify the raw code is shown once and no email is sent.
2. Parent activates; verify the account can sign in but sees no child before School approval.
3. School approves; verify the Parent sees only that child and the reviewer/timestamp are stored.
4. Approve two explicitly linked children; switch between them and verify separate metrics.
5. Copy an unrelated Student URL; verify safe denial with no student detail.
6. Verify pending, rejected, revoked, inactive Student, wrong-year, wrong-school, disabled-feature, and inactive-Publisher paths fail closed.
7. Compare immediate, after-due-date, never-release, hidden-score, and subjective-pending assessment results with the Student view.
8. Verify friendly gap/remedial wording and absence of internal scores, thresholds, evidence, and mutation controls.
9. Verify Mentor private notes/activity and Student AI conversation/prompt/answer data never appear.
10. Verify advanced Reports lock independently when plan or Reports feature is absent.
11. Verify School cannot review another School's relationship and reviewer identity cannot be supplied by the browser.
12. Reuse, expire, revoke, and concurrently submit an invitation in a disposable database; verify one successful use at most.
13. Review mobile layouts, zoom, keyboard order, headings, labels, status announcements, contrast, and screen-reader output.

## Rollback and future work

Disable `PARENT_PORTAL` and remove Parent route entry points; preserve relationship and invitation audit history. Any database rollback needs separately reviewed destructive SQL. Future work requires separate approval for authenticated existing-account linking, communication, notifications, parent-visible Mentor notes, subscription management, payment, email delivery, or custody/legal workflows.
