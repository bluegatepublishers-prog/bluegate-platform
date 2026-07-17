# Email Verification and Password Reset Checklist

Status: implemented in application code; database migration pending and intentionally not applied.

## Architecture boundary

- Email verification and account approval are independent controls.
- Email is verified once for new School signup, Teacher signup, and Student activation.
- Normal Auth.js credentials login remains email plus password; there is no login OTP.
- Password recovery uses a separate purpose-bound challenge and never reuses a Student activation or onboarding verification code.
- Parent activation, Admin, Super Admin, Mentor, and Parent authentication behavior is unchanged.

## Onboarding verification

- School signup creates an unverified `User` and `PENDING` `School`, then sends a verification code. Verification sets `User.emailVerifiedAt`; Publisher Admin approval remains required.
- Teacher signup validates an approved active School, creates an unverified `User`, `PENDING` `Teacher`, and pending association request, then sends a verification code. Verification does not create teaching assignments; School approval remains required.
- Student activation first validates the school-issued activation code, admission details, stored Student email, active Student membership, School approval, and Publisher state. It links credentials and creates an email challenge. The original activation code is revalidated and consumed only in the successful verification transaction.
- Delivery failure leaves `emailVerifiedAt` null. Student activation remains incomplete and the original activation code remains unconsumed.
- `/verify-email` receives only an HttpOnly opaque challenge reference. The page displays a masked address, six-digit input, expiry guidance, resend, and a purpose-derived back link.

## Login policy

- Auth.js verifies the password and then rejects unverified School, Teacher, and Student accounts with its existing generic credentials failure.
- School access still requires approved School and active Publisher context.
- Teacher access still requires approved/active Teacher, approved School, and active Publisher context.
- Student access still uses the existing server-resolved Student identity, active enrollment, School, Publisher, and entitlement checks.
- Verified email alone grants no dashboard or academic authority.

## Forgot-password flow

1. `/forgot-password` accepts one normalized email without asking for a role.
2. Every valid, unknown, ineligible, or rate-limited request receives: “If an eligible account exists for this email, a reset code has been sent.”
3. An eligible verified School, Teacher, or Student receives a new six-digit reset code; previous unused reset challenges are revoked.
4. `/reset-password` holds only an HttpOnly opaque challenge reference. A correct code creates a hashed, challenge-bound, ten-minute completion authorization stored in an HttpOnly cookie.
5. The server validates the new password, resolves the User exclusively from the challenge, hashes it with the existing password helper, updates it transactionally, consumes the challenge, clears the completion authorization, and revokes other unused reset challenges.
6. Reset completion does not automatically sign the user in.

## OTP and reset security

- Codes are exactly six numeric digits generated with Node cryptographic randomness.
- Verification and reset values are SHA-256 hashes using the application auth secret as a pepper, an opaque reference, and distinct security domains.
- Codes expire in ten minutes, are one-time use, and lock after five failed attempts.
- Resends have a server-side 60-second cooldown and maximum of three; each resend replaces the hash and expiry so the prior code stops working.
- Completion authorizations are 256-bit random values, stored only as hashes, expire in ten minutes, and are consumed once.
- Codes, tokens, passwords, hashes, User IDs, roles, publisher IDs, and provider details are absent from URLs, public action results, and logs.
- Passwords must be 10–128 characters and contain at least one letter and one number, with exact confirmation.

## Rate limits

- `SecurityRequestThrottle` is a database-backed minimum foundation protected by transaction advisory locks.
- Verification delivery is limited by normalized email; reset requests are limited independently by normalized email and forwarded client IP when available.
- The request window is 15 minutes with five allowed requests before a 15-minute block.
- Challenge attempt counts, resend counts, cooldowns, expiry, consumption, and revocation are persisted server-side. Client timers are not trusted.
- Future work: move or mirror request controls to the platform edge/Redis when horizontally distributed abuse controls and trusted proxy IP normalization are available.

## Legacy transition and suspension

- The additive migration backfills every existing credential-bearing `User` with `emailVerifiedAt` using `updatedAt`, then `createdAt`, then current time. Only users created after migration must complete actual email verification.
- Rejected or permanently invalid accounts cannot request recovery.
- Suspended School and Teacher accounts may reset a password, but unchanged login status checks continue to deny dashboard access. Student recovery requires an active linked Student because Student has no separate suspension status.
- JWT sessions cannot currently be centrally revoked by a password update. Existing sessions retain their natural lifetime; adding a session-version claim is a separate hardening decision.

## Email-provider readiness

- Delivery reuses the existing server-only Nodemailer integration and `EMAIL_USER` / `EMAIL_PASS`; this change does not edit environment files.
- Required subjects are `Verify your email for Bluegate` and `Reset your Bluegate password`.
- Publisher branding is included only when resolved through trusted database relations.
- Provider errors are reduced to a generic retry result. The code is never displayed or logged as a fallback.
- Before release, confirm production SMTP/Gmail credentials, sender reputation, SPF/DKIM/DMARC, bounce monitoring, provider quotas, and security-email alerting.

## Automated verification

- Policy tests cover code shape, hash separation, timing-safe comparison, expiry, consumption, failed-attempt lockout, resend limits/cooldown, throttling, masking, and completion-token entropy.
- Integration tests cover pending/unverified onboarding, Student activation binding, approval separation, password-only login, safe generic reset responses, supported and unchanged roles, server-resolved password updates, failure behavior, schema/migration safety, and no plaintext security values.
- Automated tests use no live email call.

## Manual test checklist

- [ ] Apply the pending migration through the approved deployment process in a staging database.
- [ ] Confirm an existing approved School, Teacher, and Student can still sign in after the legacy backfill.
- [ ] Confirm new School verification succeeds but login stays blocked until Publisher Admin approval.
- [ ] Confirm new Teacher verification succeeds but login stays blocked until School approval and activation.
- [ ] Confirm Student activation rejects wrong/expired/reused school activation codes and a mismatched stored email.
- [ ] Confirm failed Student verification leaves the school activation code usable until its original expiry.
- [ ] Confirm correct, incorrect, expired, fifth-failure, reused, cooldown, and fourth-resend paths for both challenge types.
- [ ] Confirm unknown, unsupported-role, unverified, rejected, suspended, and eligible emails receive indistinguishable forgot-password screens.
- [ ] Confirm the old password fails and the new password succeeds after reset for School, Teacher, and Student.
- [ ] Confirm suspended School/Teacher can reset but still cannot log in.
- [ ] Confirm Admin, Super Admin, Mentor, Parent, and all cross-role callback routing are unchanged.
- [ ] Confirm browser history, URLs, cookies visible to JavaScript, application logs, and email-provider logs expose no code/token/password/hash/internal ID.
- [ ] Simulate provider failure and confirm no verification, Student activation completion, or password change occurs.

## Deployment checklist

- [ ] Review and approve migration `20260716150000_email_verification_and_password_reset`.
- [ ] Back up the production database and validate migration duration on production-like volume.
- [ ] Configure and validate production email credentials without committing them.
- [ ] Run Prisma format/validate/generate, TypeScript, all tests, production build, and migration status in CI.
- [ ] Apply the migration before deploying application code because the generated queries require the new column and tables.
- [ ] Smoke-test signup, verification, password recovery, and every supported role after deployment.
- [ ] Monitor send failures, challenge attempt lockouts, resend limits, throttle blocks, reset completions, and login rejection rates without logging security values.
