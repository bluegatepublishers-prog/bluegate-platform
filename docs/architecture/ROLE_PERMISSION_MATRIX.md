# Role and Permission Matrix

This is the **target** matrix. `SUPER_ADMIN`, `PUBLISHER_ADMIN`, `PUBLISHER_STAFF`, `TUTOR`, and `PARENT` are not current schema roles. “Scoped” always means server-enforced tenant and relationship scope.

| Permission | Super Admin | Publisher Admin | Publisher Staff | School | Teacher | Student | Tutor | Parent |
|---|---|---|---|---|---|---|---|---|
| Platform management | Full | None | None | None | None | None | None | None |
| Publisher management | Full | Scoped | Assigned only | None | None | None | None | None |
| Branding | Full | Scoped | Assigned only | None | None | None | None | None |
| Books / chapters | Read | Full | Assigned only | Read | Read | Read | Read | Read |
| Resources | Read | Full | Assigned only | Read | Scoped | Assigned only | Assigned only | None |
| AI configuration | Full | Scoped | Assigned only | None | None | None | None | None |
| AI generation | None | Scoped | Assigned only | None | Assigned only | Own only | Assigned only | None |
| Schools | Read | Full | Assigned only | Own only | Assigned only | Own only | Assigned only | Own only |
| Academic years / classes / sections | Read | Read | Assigned only | Full | Assigned only | Read | Assigned only | Read |
| Teachers | Read | Scoped | Assigned only | Full | Own only | Read | None | None |
| Students | Read | Scoped | Assigned only | Full | Assigned only | Own only | Assigned only | Own only |
| Book approval | Read | Full | Assigned only | Scoped | Read | Read | Read | Read |
| Full-book access | Support only | Scoped | Assigned only | Scoped | Assigned only | Assigned only | Assigned only | Own only |
| Teacher resources | None | Full | Assigned only | Scoped | Assigned only | None | Assigned only | None |
| Student resources | None | Full | Assigned only | Scoped | Assigned only | Assigned only | Assigned only | Own only |
| Subscriptions | Read | Full | Assigned only | Scoped | Read | Own only | Read | Own only |
| Assignments | None | Read | Assigned only | Scoped | Full | Own only | Assigned only | Read |
| Assessments | None | Read | Assigned only | Scoped | Full | Own only | Assigned only | Read |
| Results / gap analysis | Read | Scoped | Assigned only | Scoped | Assigned only | Own only | Assigned only | Own only |
| Remedials | None | Read | Assigned only | Scoped | Assigned only | Own only | Assigned only | Read |
| Tutor assignment | Read | Scoped | Assigned only | Scoped | None | Read | Own only | Read |
| Parent access | None | None | None | Scoped | None | None | None | Own only |
| Reports | Full | Scoped | Assigned only | Scoped | Assigned only | Own only | Assigned only | Own only |
| Billing | Full | Scoped | Assigned only | Own only | None | Own only | None | Own only |
| Audit logs | Full | Scoped | Assigned only | Read | None | None | None | None |
| Support impersonation | Full | None | None | None | None | None | None | None |

## Sensitive permission notes

- “Full” never overrides tenant isolation except platform operational reporting. Super Admin support entry must be time-bound, reasoned, visible, and audited; it must not silently edit academic records.
- Publisher Staff requires an active publisher membership plus explicit permissions (for example Academic, Content, Sales, Digital, Support, Finance, or Operations templates).
- Full-book access requires identity, publisher, school relationship, academic-year context, active assignment/enrollment, approved adoption, and suitable audience. Admin/support access is separately audited.
- Students and parents see only the authenticated student or validated linked children. Tutors see only active assignments. Teachers see only assigned academic contexts.
- Billing access does not expose full payment credentials. AI configuration never exposes provider secrets.
- Current `ADMIN` maps temporarily to Bluegate `PUBLISHER_ADMIN`; it must not gain platform-wide Super Admin semantics.
