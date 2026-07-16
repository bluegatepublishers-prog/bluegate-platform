# Phase 9.10.5 Portal & Account Onboarding Checklist

Status: implementation complete in the worktree; additive migration pending and not applied.

## Architecture and flows

- [x] Existing Auth.js credentials/JWT implementation is reused; no authentication framework or learning architecture was redesigned.
- [x] Existing schools and teachers migrate as `APPROVED`; only public requests begin `PENDING`.
- [x] Bluegate is the server-selected initial publisher because trusted pre-login domains/publisher selection are not implemented.
- [x] `/portal` exposes School, Teacher, Student and Publisher Admin; Super Admin and publisher public signup are absent.
- [x] `/school-signup`, `/teacher-signup`, and `/student-activate` are responsive and accessible.
- [x] Publisher Admin reviews schools; School reviews teacher associations; teaching assignments remain separate.
- [x] Student activation attaches credentials to an existing school-owned Student and never creates membership.

## Security and audit

- [x] Browser cannot set publisher, role, approval state, reviewer, student, or teacher authority.
- [x] Pending/rejected/suspended school and teacher accounts are denied during Auth.js authorization and live dashboard resolution.
- [x] Codes are cryptographically random, hashed with the auth secret, seven-day expiring, single-use, revocable, creator/consumer audited, and concurrency locked.
- [x] Exact school, student, admission number, stored DOB when present, active state, unused identity, email, and publisher state are revalidated.
- [x] Public duplicate and activation failures use non-enumerating messages.
- [x] Existing Nodemailer environment conventions provide best-effort approval notices; mail failure never changes approval state.

## Automated and manual verification

- [x] School/teacher signup, password/normalization, duplicate email, student activation, duplicate/expired code, wrong scope, approval, suspension, login denial, and migration-safety tests.
- [ ] Database-backed concurrent activation and authenticated browser/session testing on a disposable migrated branch.
- [ ] Mobile, keyboard-only, screen-reader and live mail-provider manual testing.

## Deployment

- [ ] Apply `20260714080000_portal_account_onboarding` after every earlier pending migration through the controlled release workflow.
- [ ] Confirm existing School and Teacher rows are `APPROVED`; confirm new public records remain pending.
- [ ] Keep `AUTH_SECRET`/`NEXTAUTH_SECRET` stable after issuing activation codes.
- [ ] Smoke-test all login paths, approval states, associations and single-use activation.
- [ ] Roll back public entry routes first; preserve additive review and activation audit history.
