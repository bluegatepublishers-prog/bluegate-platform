# Platform Decision Log

Status terms: **Accepted** governs future work; **Proposed** needs approval; **Superseded** remains historical. All entries below are Accepted architecture baseline decisions. Implementation may be current or staged.

| ID | Title | Context and decision | Consequences | Review trigger |
|---|---|---|---|---|
| ADR-001 | One codebase, multiple publishers | Operate white-label publisher portals from one application and schema. | Tenant context is mandatory; avoid forks. | A regulatory or isolation need cannot be met in the shared design. |
| ADR-002 | Bluegate is the first tenant | Backfill existing records to a seeded Bluegate publisher. | Existing behavior and brand remain intact. | Business ownership of existing data changes. |
| ADR-003 | Students belong to a school | Every `Student` has a school; individual payment changes features, not academic ownership. | No unattached student accounts. | A direct-to-consumer product is approved. |
| ADR-004 | Placement uses enrollment | Class and section placement belongs in annual `StudentEnrollment`, not `Student`. | Promotion preserves history. | None; this is a core invariant. |
| ADR-005 | Book approval is annual | Adoption is scoped to school, academic year, class/section/subject, and book. | Renew each year; retain prior decisions. | Licensing policy changes. |
| ADR-006 | Book and premium access differ | Adoption/book entitlement answers content access; subscription answers premium learning features. | Separate checks and models. | Commercial packaging changes. |
| ADR-007 | Preview and full book differ | Public preview and protected full book are separate files and fields. | Public selects must omit full-book locations. | A new protected delivery format replaces PDFs. |
| ADR-008 | Resource audience is explicit | `TEACHER_ONLY`, `STUDENT`, or `BOTH` controls visibility; file type does not. | Add audience before student library. | More audience classes are required. |
| ADR-009 | AI is grounded | AI may use only approved, entitled book knowledge. | Reject ungrounded preparation; calls remain server-only. | A separately governed general AI product is approved. |
| ADR-010 | Preserve academic history | Deactivate/end-date records instead of rewriting prior years. | Restrictive relations and audited correction paths. | Retention policy requires lawful deletion. |
| ADR-011 | Teachers may hold both assignment types | A teacher can be class teacher and subject teacher across multiple sections/subjects. | Authorization evaluates each active assignment. | Assignment policy changes. |
| ADR-012 | Server resolves ownership | Identity, publisher, school, assignment, and enrollment derive from authenticated server context. | Browser IDs are only requested targets and must be re-scoped. | None. |
| ADR-013 | Super and Publisher Admin differ | Platform operations and tenant content administration are separate roles. | Support access is explicit and audited. | Operating model merges responsibilities. |
| ADR-014 | Staff uses permissions | Publisher staff receives permission profiles, not blanket admin access. | Introduce memberships, templates, and assignments. | Team size never warrants delegated access. |
| ADR-015 | Premium payer may vary | School or individual student may fund premium features. | Subscription records identify beneficiary and payer/source. | Sales policy standardizes one payer. |
| ADR-016 | Individual premium keeps school link | Individually subscribed students retain school and enrollment scope. | No duplicate student identity. | Direct-to-consumer exception is approved. |
| ADR-017 | Tutor assignment is explicit | Tutor access requires active `TutorAssignment` to named students and scope. | No automatic school-wide access. | Tutor operating model changes. |
| ADR-018 | Additive multi-tenancy | Add tenant roots, nullable keys, backfill, scope queries, then enforce constraints. | No big-bang migration or production reset. | A new empty deployment removes backfill needs. |
| ADR-019 | Visibility is not authorization | Navigation hiding improves UX; every server operation independently checks features and scope. | Test disabled-feature APIs directly. | None. |
| ADR-020 | Protected storage uses private objects | Full books and internal resources target private storage with short-lived signed access. | Current public Blob URLs are transitional. | Storage provider offers an equivalent stronger control. |

New decisions use the next ID and include status, context, decision, consequences, owner/date, and review trigger.
