# Operational Stabilization QA

## Data safety gate

- Confirm `DATABASE_URL` points to a disposable local database before cleanup.
- Run `npm run cleanup:operational-demo` first. This is always a dry run.
- Review every operational dependency count and verify the target is exactly the seeded Bluegate Demonstration School.
- The cleanup utility refuses remote databases and refuses any demo school with dependent operational records.
- Apply only to a reviewed local database with:
  `npm run cleanup:operational-demo -- --apply --confirm=DELETE_BLUEGATE_DEMO_SCHOOL`
- Verify publisher books, chapters, resources, videos, series, subjects, publisher settings, and publisher users are unchanged.
- Never run the seed or cleanup utility against production during this stabilization pass.

## Complete school workflow

1. Create and approve a school.
2. Create one current academic session.
3. Create a class, section, and section subjects.
4. Create a teacher; verify no free-text class or subject authority is requested.
5. Assign the teacher to the exact section and subject.
6. Create and enroll a student in the current session, class, and section.
7. Open School Books, request publisher adoption, approve it from the publisher workflow, then assign the approved book.
8. Open School Resources and assign publisher resources from the class setup.
9. Verify the teacher sees only officially assigned current-session subjects, books, resources, classes, and assignments.
10. Verify the student sees every active section subject, student-visible assigned resource, approved assigned book, and visible classroom assignment.

## Security and inheritance

- A class-teacher designation alone must not expose another subject's books or resources.
- A teacher cannot create an assignment without selecting an officially assigned subject.
- Prior-session teacher assignments do not appear in current teacher classrooms or resource access.
- Book assignment accepts only an approved same-publisher adoption for the exact academic session and section subject.
- Resource access derives from the section-subject assignment independently of book adoption.
- `TEACHER_ONLY` resources remain absent from student projections and protected downloads.
- Direct foreign IDs for schools, teachers, students, books, resources, sections, and assignments fail closed.

## Responsive and accessibility checks

- Check school navigation and workspaces at 320, 375, 768, 1024, and 1440 pixels.
- Confirm there is no horizontal viewport scrolling.
- Confirm the mobile school menu expands vertically and remains keyboard accessible.
- Confirm long school, teacher, book, and resource names wrap.
- Confirm all forms have visible labels or meaningful placeholders and usable focus states.

## Validation gate

- `git diff --check`
- `npx.cmd prisma format`
- `npx.cmd prisma validate`
- `npx.cmd prisma generate`
- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd test`

No migration, commit, push, deployment, seed, or cleanup execution is part of this pass.
