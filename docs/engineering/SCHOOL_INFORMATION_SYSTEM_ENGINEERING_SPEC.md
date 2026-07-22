# SARTHI School Information System (SIS) Engineering Specification

**Version:** 4.0

**Status:** Engineering Ready

**Module:** School Information System (SIS)

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The School Information System (SIS) provides comprehensive management of educational institutions within SARTHI.

It manages schools, campuses, academic sessions, admissions, classes, students, teachers, parents, attendance, academic records, communication, and institutional operations through a unified platform.

The SIS acts as the operational system of record for institutions.

---

# Scope

The SIS is responsible for:

- Institution management
- Campus management
- Academic session management
- Admissions
- Student lifecycle
- Teacher lifecycle
- Parent relationships
- Class and section management
- Academic records
- Promotion and graduation
- Operational workflows
- Audit logging

---

# Design Principles

The SIS shall be:

- Institution Agnostic
- Multi-Campus Ready
- Multi-Tenant
- Role Driven
- Event Driven
- Secure
- Scalable
- AI Ready

---

# Architecture

```
Institution

├── Campuses
│
├── Academic Years
│
├── Classes
│
├── Sections
│
├── Students
│
├── Teachers
│
├── Parents
│
├── Subjects
│
├── Timetables
│
├── Attendance
│
├── Assessments
│
├── Communication
│
└── Administration
```

---

# Institution Hierarchy

Support:

Organization

↓

School Group

↓

School

↓

Campus

↓

Building

↓

Floor

↓

Room

↓

Class

↓

Section

Institution hierarchy remains configurable.

---

# Academic Session

Support:

- Academic Year
- Terms
- Semesters
- Trimesters
- Examination periods
- Vacation periods
- Holidays

Multiple calendars may coexist.

---

# Student Lifecycle

Admission Inquiry

↓

Application

↓

Verification

↓

Enrollment

↓

Class Assignment

↓

Academic Progress

↓

Promotion

↓

Transfer

↓

Graduation

↓

Alumni

↓

Archived

---

# Teacher Lifecycle

Recruitment

↓

Verification

↓

Appointment

↓

Subject Allocation

↓

Class Allocation

↓

Performance Tracking

↓

Professional Development

↓

Promotion

↓

Exit

↓

Archived

---

# Parent Relationships

Support:

- Father
- Mother
- Guardian
- Emergency Contact
- Foster Parent
- Institutional Guardian

Multiple guardians per learner are supported.

---

# Admissions

Support:

- Online applications
- Offline entry
- Document verification
- Admission workflow
- Waiting lists
- Seat allocation
- Admission analytics

Admissions are configurable by institution.

---

# Class Management

Support:

- Grades
- Classes
- Sections
- Streams
- Houses
- Clubs
- Groups

Students may belong to multiple activity groups.

---

# Academic Records

Maintain:

- Enrollment history
- Subject registrations
- Assessment history
- Attendance history
- Behaviour records
- Awards
- Certificates

Historical records remain immutable.

---

# Transfers

Support:

- Internal transfers
- Campus transfers
- School transfers
- Tenant migration
- Archive exports

Transfer history is permanently retained.

---

# Communication

Integrate with:

- Notification Service
- Parent Engagement
- Email
- SMS
- Push notifications
- WhatsApp (where configured)

Communication is role aware.

---

# AI Readiness

Provide context for:

- Student summaries
- Teacher assistants
- Admission recommendations
- Attendance prediction
- Academic risk detection
- Administrative automation

---

# APIs

Examples:

GET /api/v1/schools

POST /api/v1/students

GET /api/v1/students/{id}

POST /api/v1/admissions

POST /api/v1/promotions

GET /api/v1/classes

---

# Security

Enforce:

- Tenant isolation
- FERPA/GDPR-aware data handling
- Role-based permissions
- Fine-grained authorization
- Audit logging

Personally identifiable information is protected.

---

# Audit Events

Generate events for:

- Student admitted
- Student promoted
- Student transferred
- Teacher assigned
- Parent linked
- Academic year opened
- Academic year closed

Audit records are immutable.

---

# Analytics

Track:

- Enrollment trends
- Admission conversion
- Promotion rates
- Retention rates
- Student mobility
- Teacher workload
- Capacity utilization

---

# Performance

Support:

- Millions of students
- Millions of academic records
- Horizontal scaling
- Multi-campus deployments
- High availability

---

# Acceptance Criteria

✓ Institution hierarchy

✓ Student lifecycle

✓ Teacher lifecycle

✓ Admissions

✓ Academic records

✓ Parent relationships

✓ AI-ready data model

✓ Complete audit logging

---

# Future Enhancements

- Digital student identity cards
- School transport management
- Hostel management
- Medical records integration
- Fee management integration
- Government education reporting
- Cross-institution learner mobility

---

# Guiding Principle

The School Information System is the authoritative operational record for every educational institution using SARTHI, ensuring that students, educators, parents, and administrators share a consistent, secure, and scalable academic foundation.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**