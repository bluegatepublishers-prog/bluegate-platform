# Phase 8.0 Tenant-Isolation Verification

Run against disposable fixtures only after the pending migration is deployed to a non-production environment.

- [ ] Bluegate Admin lists Bluegate books and resources.
- [ ] Bluegate Admin cannot list, fetch, edit, or delete Publisher B content by URL, API ID, action ID, search, or crafted payload.
- [ ] Bluegate Admin cannot view or edit a Publisher B school.
- [ ] School A book selectors contain only its publisher's books.
- [ ] School A cannot request a Publisher B book by posting its ID.
- [ ] Publisher B Admin cannot review, approve, reject, or revoke a Bluegate adoption.
- [ ] A Bluegate teacher cannot open another publisher's full-book route or use its knowledge in AI.
- [ ] Super Admin can open publisher list/detail and activate or suspend a publisher.
- [ ] Admin, School, Teacher, and Student sessions are rejected from `/super-admin`.
- [ ] Super Admin receives no implicit publisher context and cannot enter `/admin` as a tenant admin.
- [ ] Existing Bluegate users, schools, books, resources, series, inspections, and adoptions have `publisher_bluegate` after backfill.
- [ ] Existing admin, school, and teacher login redirects remain unchanged; Super Admin redirects only to `/super-admin`.
- [ ] New authenticated uploads use `publishers/{publisherId}/...`; existing legacy URLs remain readable.

Before making `publisherId` required, query every selected table for null ownership and validate that adoption publisher, school publisher, and book publisher agree. Any mismatch blocks enforcement.
