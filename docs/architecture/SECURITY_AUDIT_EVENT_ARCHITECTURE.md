# Security Audit Event Architecture

## Purpose and scope

`SecurityAuditEvent` is Edora Education OS's append-only evidence ledger for privileged platform, publisher, and account-security changes. It records who acted, the authority and tenant context verified at the time, what class of object changed, the outcome, and a small allow-listed description of the change. It is not application telemetry, a request log, or a store for business content.

Stage 3 prioritizes reliable event creation and tenant isolation. It does not add a user-facing viewer, export, retention job, Institution Private Library feature, or Competitive Exam Portal feature.

## Event schema

Each event contains:

- A CUID primary key and database timestamp.
- Scalar `actorUserId`, `actorRole`, and `publisherId` snapshots.
- An indexed dot-separated action identifier.
- A target type and optional safe target identifier.
- A constrained `SUCCESS`, `DENIED`, or `FAILURE` outcome.
- An optional stable uppercase reason code.
- A UUID correlation identifier.
- Optional allow-listed JSON metadata.
- Schema version `1`.

Actor and publisher identifiers deliberately have no foreign keys. Deleting or changing an operational user or publisher cannot rewrite or cascade-delete historical audit evidence. The values are historical snapshots, not claims that the referenced records still exist.

## Action naming convention

Actions use lowercase dot-separated identifiers in the form `<authority>.<domain>.<operation>`, for example:

- `platform.publisher.update`
- `platform.publisher.feature.set`
- `publisher.book.create`
- `publisher.book_adoption.revoke`
- `account.password_reset.complete`

The action column is a string so new operations can be introduced without a PostgreSQL enum migration. Application code constrains currently supported values through a typed allow-list. Outcomes remain a database enum because their semantics are intentionally closed.

## Trusted actor and tenant snapshots

Audit callers receive actor context only from live database-verified authorization guards. Super Admin events capture `SUPER_ADMIN` with a null publisher. Publisher Admin events capture `ADMIN` and the publisher ID returned by the live guard. Account-security success events derive the user, role, and publisher from the server-resolved challenge relation.

Browser-supplied roles, publisher IDs, metadata, or ownership facts are never accepted. A browser may identify the intended target, but ownership is re-read under the actor's trusted publisher scope before a success event is written.

## Atomicity policy

A successful privileged database mutation and its `SUCCESS` audit event are inserted in the same Prisma transaction wherever technically possible. The event is written after the guarded mutation succeeds but before commit. If event validation or insertion fails, the transaction fails and the business mutation rolls back.

File deletion from Vercel Blob occurs after the database transaction because the external object store cannot participate in a PostgreSQL transaction. The audit event records only a safe `fileOperation` and count; it never stores a Blob URL. Existing cleanup functions continue to report sanitized best-effort cleanup warnings. The database mutation and its audit event remain atomic, while external file cleanup is an explicitly documented residual boundary.

## Denied and failure policy

A denied event is eligible only after a trusted actor has been established. Cross-tenant and missing-target responses remain indistinguishable. Denied-event recording forces `targetId` to null and stores only a stable reason such as `CROSS_TENANT_SCOPE`; it never records foreign record attributes. A denied audit write is best-effort so a logging failure cannot change a safe 404/denial into an information leak.

Unauthenticated requests, invalid challenge noise, and account-enumeration-sensitive password-reset requests do not create audit rows. Email verification and password-reset completion are audited only after server-side challenge validation succeeds. Unexpected failures may use `UNEXPECTED_FAILURE`; raw exception text, stack traces, SQL errors, and provider messages are prohibited.

## Metadata allow-list and privacy

Metadata is constructed server-side and accepts only these keys:

- `changedFields`
- `decision`
- `enabled`
- `featureKey`
- `fileCount`
- `fileOperation`
- `fromStatus`
- `plan`
- `purpose`
- `scope`
- `toStatus`
- `verified`

Values are limited to booleans, bounded safe integers, short identifier-like strings, or at most 20 short strings. Nested objects are rejected and the serialized object is capped at 2 KiB. Unknown and secret-like keys are rejected.

Audit events must never contain passwords, password hashes, verification/reset codes or tokens, API keys, cookies, authorization headers, connection strings, request bodies, email bodies, AI prompts or responses, student answers, private student content, files, or full file/Blob URLs. Names and email addresses are unnecessary and excluded.

## Instrumented Stage 3 operations

- Super Admin publisher activation, branding/profile changes, and publisher feature changes.
- Publisher Admin publisher branding/settings changes.
- Publisher Admin book creation, update/publication changes, file replacement intent, and deletion.
- Publisher Admin resource creation, update/publication changes, file replacement intent, and deletion.
- Publisher Admin school approval/rejection/suspension.
- School-driven teacher approval/rejection/suspension and Publisher Admin teacher verification/AI-plan changes.
- Publisher Admin book-adoption approval, rejection, and revocation.
- Successful email verification and password-reset completion.

Publisher creation, publisher ownership/Admin assignment, password change outside reset, and Super Admin provisioning have no live application workflow in this repository. Their action identifiers or future integration points must use the same service when those workflows are introduced. Provisioning must not be added to public routes.

## Access policy

Stage 3 adds no viewer or public API. The policy foundation is:

- A live database-verified Super Admin with `publisherId = null` may receive platform-wide scope.
- A live Publisher Admin may receive only rows whose historical `publisherId` equals its own publisher.
- Publisher Admin cannot read platform-neutral Super Admin events.
- School, Teacher, Student, Mentor, Parent, anonymous, and malformed identities receive no audit scope.

Any future viewer must paginate and filter on the server, project only approved fields, provide no edit/delete controls, and ship without CSV export in its first release.

## Append-only database behavior

Migration `20260717180000_security_audit_events` creates the enum, table, constraints, indexes, and the table-specific `SecurityAuditEvent_append_only` trigger. The trigger rejects every `UPDATE` and `DELETE` while leaving `INSERT` available. Application code exposes creation only and has no ordinary update or delete service.

The trigger also blocks routine retention deletion. Retention and legal deletion therefore require a separately approved operational policy and a purpose-built DBA migration that explicitly addresses evidentiary, contractual, and legal obligations. Operators must never disable the trigger ad hoc. A rollback or legal-erasure procedure must name the exact rows, preserve an approved evidence trail, and restore append-only enforcement in the same controlled change.

## Investigation workflow

An authorized investigator starts with a time window, action, outcome, correlation ID, actor snapshot, or publisher snapshot. Queries must use indexed server-side filters and return the minimum required fields. Investigators correlate an event with business state and sanitized application logs; they do not treat the audit ledger as a source of current user or publisher attributes. Access to audit data itself should become auditable when a viewer is introduced.

## Future module events

The Institution Private Library will eventually require events for library configuration, collection ownership, document upload/replacement/deletion, access-policy changes, and privileged sharing. The Competitive Exam Portal will eventually require events for exam configuration, publication, privileged question-bank changes, eligibility overrides, and result-release controls. These are architecture requirements only; neither module is implemented in Stage 3.
