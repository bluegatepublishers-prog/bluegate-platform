# SARTHI Classroom Module QA Checklist

**Platform:** SARTHI Education OS  
**Module:** Teacher Classroom  
**Document version:** 1.0  
**Status:** Testing required  
**Applies to:** Teacher, Student, School Admin, Publisher Admin and platform security boundaries

---

## 1. Purpose

This document defines the acceptance criteria for the SARTHI Classroom Module.

The Classroom Module must not be considered production-ready until the required functional, responsive, security, accessibility and tenant-isolation tests have passed.

The Assignment Module must not begin until the Classroom foundation is stable and internally consistent.

---

## 2. Scope

This checklist covers:

- Teacher My Classes
- Assigned class access
- Class workspace
- Class overview
- Student list
- Class materials
- Material uploads
- Publisher resources
- AI-generated materials
- Material scheduling
- Material sharing
- Material reuse
- Material archiving
- Student material visibility
- Protected material opening
- Card and list views
- Responsive behaviour
- Tenant isolation
- Role authorization
- Security audit events

The following features are not part of this acceptance checklist:

- Full assignment creation
- Student assignment submissions
- Assignment evaluation
- Attendance entry
- Announcements
- Full classroom analytics

These may appear as future-ready placeholders only.

---

# 3. Test Environment

Record the environment before testing.

| Item | Value |
|---|---|
| Git branch | |
| Git commit | |
| Test date | |
| Tester | |
| Environment | Local / Staging / Production |
| Database | |
| Browser | |
| Device | |
| Screen size | |

---

# 4. Pre-Test Technical Validation

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd tsc --noEmit
npm run lint
npm run build
git diff --check