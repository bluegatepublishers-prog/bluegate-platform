# SARTHI Attendance & Discipline Engineering Specification

**Version:** 4.0

**Status:** Engineering Ready

**Module:** Attendance & Discipline

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Attendance & Discipline platform records learner and staff attendance, manages leave requests, monitors punctuality, supports positive behaviour management, tracks wellbeing, and provides early intervention insights.

The platform helps educational institutions improve participation, student wellbeing, classroom culture, and academic success through data-driven decision making.

---

# Scope

The platform is responsible for:

- Student attendance
- Teacher attendance
- Staff attendance
- Subject attendance
- Activity attendance
- Leave management
- Late arrival tracking
- Early departure tracking
- Behaviour management
- Positive recognition
- Intervention workflows
- Attendance analytics

---

# Design Principles

The platform shall be:

- Student Centric
- Institution Aware
- Positive Behaviour Focused
- Mobile First
- Event Driven
- AI Ready
- Secure
- Scalable

---

# Architecture

```
Attendance & Discipline

├── Attendance Engine
├── Leave Manager
├── Behaviour Manager
├── Recognition Manager
├── Intervention Engine
├── Wellbeing Tracker
├── Analytics
├── Parent Notifications
├── AI Risk Detection
└── Audit Logger
```

---

# Attendance Types

Support:

- Daily attendance
- Period attendance
- Subject attendance
- Laboratory attendance
- Online attendance
- Hybrid attendance
- Examination attendance
- Club attendance
- Sports attendance
- Event attendance

Institutions configure required attendance types.

---

# Attendance Status

Support:

- Present
- Absent
- Late
- Excused
- Medical Leave
- Official Duty
- Work Experience
- Field Visit
- Online Present
- Holiday

Status definitions remain configurable.

---

# Attendance Recording

Support recording through:

- Teacher dashboard
- School administration
- QR code
- RFID/NFC
- Biometric systems
- Mobile application
- Parent confirmation (where permitted)
- API integration

Offline capture with later synchronization is supported.

---

# Leave Management

Support:

- Student leave
- Teacher leave
- Staff leave
- Half-day leave
- Medical leave
- Emergency leave
- Planned leave

Approval workflows are configurable.

---

# Behaviour Management

Record:

- Positive observations
- Classroom participation
- Leadership
- Teamwork
- Respect
- Responsibility
- Behaviour incidents
- Counselling referrals
- Restorative actions

The platform emphasizes improvement rather than punishment.

---

# Positive Recognition

Support:

- Certificates
- Merit points
- House points
- Digital badges
- Teacher appreciation
- Leadership recognition
- Community service recognition

Recognition contributes to learner portfolios.

---

# Wellbeing Tracking

Support:

- Wellness check-ins
- Counsellor notes
- Student support plans
- Safeguarding flags
- Follow-up actions

Access is restricted to authorized roles.

---

# Intervention Workflows

Automatically identify:

- Chronic absenteeism
- Frequent lateness
- Declining participation
- Behaviour trends
- Attendance risk
- Wellbeing concerns

Interventions may involve teachers, counsellors, parents, or administrators.

---

# Parent Integration

Notify parents about:

- Student absence
- Late arrival
- Leave approval
- Attendance summary
- Behaviour recognition
- Behaviour concerns
- Scheduled interventions

Notification timing is configurable.

---

# AI Attendance & Behaviour Assistant

Provide AI-assisted:

- Attendance trend analysis
- Risk prediction
- Intervention recommendations
- Behaviour summaries
- Early warning alerts
- Institutional trend analysis

AI recommendations require human review before action.

---

# APIs

Examples:

GET /api/v1/attendance

POST /api/v1/attendance

POST /api/v1/leave

GET /api/v1/behaviour

POST /api/v1/interventions

GET /api/v1/attendance/analytics

---

# Security

Enforce:

- Tenant isolation
- Role-based permissions
- Student privacy
- Wellbeing confidentiality
- Audit logging

Sensitive wellbeing records have enhanced access controls.

---

# Audit Events

Generate events for:

- Attendance recorded
- Attendance corrected
- Leave approved
- Leave rejected
- Behaviour record created
- Recognition awarded
- Intervention initiated

Audit records are immutable.

---

# Analytics

Track:

- Attendance percentage
- Chronic absenteeism
- Teacher attendance
- Late arrival trends
- Leave utilization
- Behaviour trends
- Recognition distribution
- Intervention outcomes

---

# Performance

Support:

- Millions of attendance records
- Real-time attendance updates
- Offline synchronization
- Horizontal scaling
- High availability

---

# Acceptance Criteria

✓ Attendance management

✓ Leave workflows

✓ Behaviour management

✓ Positive recognition

✓ Intervention workflows

✓ Parent notifications

✓ AI-assisted risk detection

✓ Complete audit logging

---

# Future Enhancements

- Face recognition attendance
- Indoor location verification
- Predictive absenteeism modeling
- Smart campus integration
- Transportation attendance
- Wearable device integration

---

# Guiding Principle

Attendance and discipline should support learner success rather than merely enforce compliance. SARTHI should help institutions identify challenges early, celebrate positive behaviour, strengthen wellbeing, and build a supportive educational environment where every learner has the opportunity to thrive.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**