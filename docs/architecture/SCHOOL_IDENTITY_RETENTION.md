# School lifecycle and identity retention

## Audit findings

- `User` owns the login identity. `Teacher`, `Student`, and `Parent` are role profiles linked to that identity.
- `Teacher.schoolId` and `Student.schoolId` existed as direct current-school pointers. The teacher pointer used `SetNull`; the student pointer used `Cascade`.
- `StudentEnrollment` already retained class, section, academic year, joined date, left date, and status, but its school and student relations cascaded.
- `SchoolStaffMembership` existed, but it allowed only one row per school/user and did not record a lifecycle status, end date, or direct teacher reference.
- `AcademicYear`, `SchoolClass`, `StudentEnrollment`, `SchoolStaffMembership`, and `TeacherAssignment` included school-related cascades capable of erasing operational or historical rows if a school were physically deleted.
- Assessments, attempts, results, classroom assignments, and submissions already use restrictive school/history relations. No issued report-card model existed.
- No ordinary school delete service or publisher UI was found. Publisher teacher-management routes and teacher AI-plan mutation controls did exist.

## Retained architecture

- `Student` and its optional `User` remain permanent. `Student.schoolId` is retained only as the current-school compatibility pointer; `StudentEnrollment` is the authoritative history.
- An enrollment now stores the admission number snapshot. A transfer closes the prior active enrollment as `TRANSFERRED`, creates a new enrollment, and then changes the student's current-school pointer without changing `Student.id` or `User.id`.
- `Teacher` and `User` remain permanent. `SchoolStaffMembership` is the authoritative employment history and supports multiple historical rows through a nullable unique `activeKey`.
- Active teacher authority requires an approved school, an active `SchoolStaffMembership`, a current active academic year, and an active official assignment. Ending employment closes the membership and active assignments without deleting authorship or grading history.
- Parent/student links remain independent of school membership. Historical report-card reads authorize the permanent student identity or an approved parent relationship, never the requesting school.

## Lifecycle policy

- `PAUSED`: operational guards fail closed because only `APPROVED` schools may mutate or use active learning services.
- `SUSPENDED`: administrative and operational access is blocked; identities and history remain.
- `REVOKED`: publisher service access is blocked; retained rows and content references remain.
- `ARCHIVED`: omitted from the normal school list and blocked from operational use; it can be restored to `PAUSED` for deliberate review before resuming.
- Publisher administrators cannot permanently delete schools. The dependency counter and blocked-attempt audit provide a safe explanation if such an action is requested.

## Report cards

`ReportCardSnapshot` is append-only at the service layer. It snapshots school, session, class, section, subject results, attendance, display names, issue time, document ID, and version. No update or delete operation is exposed. Current school services receive no API for prior-school snapshots.

## Known boundaries

- A receiving-school transfer UI is intentionally not included. The server-side transfer foundation is available for a future explicit, approved transfer workflow.
- `Student.schoolId` and `Teacher.schoolId` remain compatibility pointers because removing them would require a wider staged migration across existing dashboards. Tenant authority is derived from enrollment/membership plus current school state.
- Existing publisher book approval remains request/adoption based. Resource publication remains publisher-wide and class/section assignment remains a school responsibility; a separate per-school resource-catalog entitlement model was not introduced in this focused pass.
- The application has no attendance, certificate, or dedicated transfer-document model to migrate. Existing assessment results are retained, and issued report cards now have a dedicated immutable snapshot model.
