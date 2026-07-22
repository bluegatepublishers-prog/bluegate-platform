# SARTHI Parent Engagement Platform Engineering Specification

**Version:** 4.0

**Status:** Engineering Ready

**Module:** Parent Engagement Platform

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Parent Engagement Platform connects families with educational institutions through secure, timely, and meaningful communication.

It enables parents and guardians to monitor academic progress, attendance, assignments, wellbeing, achievements, schedules, and school communications while actively participating in their child's educational journey.

The platform strengthens collaboration between parents, teachers, students, and institutions.

---

# Scope

The platform is responsible for:

- Parent identity
- Guardian relationships
- Student linkage
- Academic visibility
- Attendance monitoring
- Assignment tracking
- School communication
- Teacher interaction
- Event participation
- Consent management
- Parent analytics
- AI-powered guidance

---

# Design Principles

The platform shall be:

- Parent Friendly
- Mobile First
- Secure
- Multi-Tenant
- Role Aware
- Privacy Focused
- AI Ready
- Accessible

---

# Architecture

```
Parent Engagement Platform

├── Parent Identity
├── Guardian Relationships
├── Student Dashboard
├── Attendance
├── Academic Progress
├── Assignments
├── Timetable
├── School Communication
├── Teacher Communication
├── Events
├── Consent Manager
├── Notifications
├── Parent Analytics
└── AI Parent Assistant
```

---

# Parent Identity

Each parent receives a permanent Parent Identity (PID).

Parents may be linked to:

- One student
- Multiple students
- Multiple schools
- Multiple campuses

Parent identity remains independent of institutions.

---

# Guardian Relationships

Support:

- Father
- Mother
- Legal Guardian
- Foster Parent
- Emergency Guardian
- Institutional Guardian

Relationship permissions are configurable.

---

# Student Dashboard

Parents may view:

- Student profile
- Today's timetable
- Attendance summary
- Homework
- Assignments
- Upcoming assessments
- Teacher feedback
- Announcements
- Events

Dashboard visibility depends on institution policies.

---

# Academic Progress

Provide access to:

- Marks
- Grades
- Competency progress
- Learning outcomes
- Assessment history
- Teacher remarks
- Growth trends

Historical records remain available.

---

# Attendance

Parents may view:

- Daily attendance
- Subject attendance
- Monthly summary
- Leave applications
- Attendance alerts

Real-time notifications are supported.

---

# Assignments

Display:

- Homework
- Projects
- Worksheets
- Due dates
- Submission status
- Teacher feedback

Parents may receive reminder notifications.

---

# Communication

Support:

- Announcements
- Circulars
- Notices
- Messages
- Emergency alerts
- Broadcast notifications

Communication integrates with the Notification Service.

---

# Teacher Interaction

Support:

- Parent-teacher meeting scheduling
- Secure messaging
- Appointment requests
- Meeting summaries

Institutions control communication policies.

---

# Events

Support:

- School events
- Competitions
- Parent meetings
- Workshops
- Webinars
- Academic calendar

RSVP functionality is supported.

---

# Consent Management

Manage consent for:

- Student photographs
- Educational trips
- Medical care
- Digital services
- AI-enabled features
- Third-party integrations

Consent history is immutable.

---

# Notifications

Notify parents about:

- Attendance
- Homework
- Assessments
- Results
- Behaviour updates
- School announcements
- Emergency situations

Notification preferences are configurable.

---

# AI Parent Assistant

Provide AI-assisted:

- Homework guidance
- Academic summaries
- Parent-friendly explanations
- Learning recommendations
- Progress summaries
- Study planning suggestions

AI provides guidance only and does not replace teacher communication.

---

# APIs

Examples:

GET /api/v1/parents

GET /api/v1/parents/{id}/students

GET /api/v1/parents/{id}/dashboard

GET /api/v1/parents/{id}/attendance

POST /api/v1/parents/{id}/appointments

GET /api/v1/parents/{id}/notifications

---

# Security

Enforce:

- Tenant isolation
- Guardian verification
- Student relationship validation
- Role-based permissions
- Audit logging

Parents only access authorized student information.

---

# Audit Events

Generate events for:

- Parent linked
- Guardian updated
- Consent recorded
- Appointment scheduled
- Message sent
- Notification delivered
- Parent login

Audit records are immutable.

---

# Analytics

Track:

- Parent engagement
- Attendance acknowledgement
- Homework participation
- Communication responsiveness
- Meeting participation
- Consent completion
- AI assistant usage

---

# Performance

Support:

- Millions of parents
- Real-time notifications
- Mobile synchronization
- Horizontal scaling
- High availability

---

# Acceptance Criteria

✓ Parent identity

✓ Guardian relationships

✓ Student dashboard

✓ Attendance monitoring

✓ Academic visibility

✓ Communication platform

✓ AI parent assistant

✓ Complete audit logging

---

# Future Enhancements

- Family learning plans
- Multi-language AI conversations
- Parent community groups
- Volunteer management
- Digital permission workflows
- Voice-enabled parent assistant

---

# Guiding Principle

Parents are partners in education. SARTHI should provide clear, timely, secure, and meaningful engagement that strengthens trust between families and educational institutions while supporting every learner's success.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**