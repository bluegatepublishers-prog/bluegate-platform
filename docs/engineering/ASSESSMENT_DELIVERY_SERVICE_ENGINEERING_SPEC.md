# SARTHI Assessment Delivery Service Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Assessment Delivery Service

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Assessment Delivery Service manages the secure delivery, execution, monitoring, submission, and completion of assessments across the SARTHI platform.

It provides a common execution environment for quizzes, examinations, assignments, adaptive assessments, AI-assisted assessments, and certification exams.

---

# Scope

The Assessment Delivery Service is responsible for:

- Assessment scheduling
- Candidate authentication
- Secure assessment sessions
- Question delivery
- Autosave
- Time management
- Submission
- Proctoring integration
- Offline recovery
- Result handoff
- Audit logging

---

# Design Principles

The service shall be:

- Secure
- Reliable
- Scalable
- Device Independent
- Low Latency
- Fault Tolerant
- Offline Resilient
- Accessible

---

# Architecture

```
Assessment Platform

↓

Assessment API

↓

Assessment Delivery Service

├── Session Manager
├── Scheduler
├── Candidate Validator
├── Question Loader
├── Timer Service
├── Autosave Service
├── Submission Manager
├── Proctoring Integration
├── Result Publisher
├── Audit Logger
└── Analytics

↓

Assessment Engine
```

---

# Assessment Lifecycle

Draft

↓

Scheduled

↓

Available

↓

Started

↓

In Progress

↓

Paused (where permitted)

↓

Submitted

↓

Evaluated

↓

Published

↓

Archived

---

# Supported Assessment Types

Support:

- Practice Quiz
- Homework
- Assignment
- Class Test
- Periodic Test
- Unit Test
- Half-Yearly
- Annual Examination
- Competitive Exam
- Entrance Test
- Certification Exam
- AI Adaptive Assessment

Assessment types remain configurable.

---

# Scheduling

Support:

- Immediate
- Scheduled
- Recurring
- Time Window
- Deadline Based
- Invitation Only

---

# Candidate Authentication

Validate:

- Identity
- Enrollment
- Organization Membership
- Eligibility
- Permissions

Authentication occurs before session creation.

---

# Assessment Session

Each session stores:

- Session ID
- Candidate
- Assessment
- Tenant
- Device
- Browser
- IP
- Start Time
- Last Activity
- Submission Status

---

# Question Delivery

Support:

- Sequential delivery
- Randomized questions
- Randomized options
- Section-based navigation
- Adaptive question selection
- Multimedia questions

---

# Timer Management

Support:

- Global timer
- Section timer
- Question timer
- Grace period
- Extra time accommodations

Timers continue reliably across reconnections.

---

# Autosave

Automatically save:

- Responses
- Progress
- Navigation state
- Timer state

Autosave should occur periodically and on significant user actions.

---

# Offline Recovery

Support:

- Temporary offline operation
- Local encrypted caching
- Automatic synchronization
- Conflict detection

Offline mode is configurable by assessment type.

---

# Submission

Submission may occur:

- Manually
- Automatically on timeout
- Automatically on completion
- Administrator intervention

Duplicate submissions are prevented.

---

# Proctoring

Integrate with:

- Browser lockdown
- Webcam monitoring
- Screen monitoring
- Identity verification
- AI anomaly detection
- Third-party proctoring providers

Proctoring is optional and configurable.

---

# Accessibility

Support:

- Screen readers
- Keyboard navigation
- Adjustable font size
- High contrast mode
- Extended time
- Alternative input methods

---

# Security

Enforce:

- HTTPS
- Session validation
- Encryption
- Anti-tampering
- Browser validation
- Device fingerprinting (optional)
- Tenant isolation
- Audit logging

---

# Result Handoff

After submission:

↓

Evaluation Service

↓

Score Calculation

↓

Result Publishing

↓

Analytics

The Assessment Delivery Service does not calculate scores.

---

# APIs

Examples:

POST /api/v1/assessments/start

GET /api/v1/assessments/session/{id}

PATCH /api/v1/assessments/session/{id}/save

POST /api/v1/assessments/session/{id}/submit

GET /api/v1/assessments/session/{id}/status

---

# Audit Events

Generate events for:

- Assessment start
- Question viewed
- Response saved
- Submission
- Timeout
- Reconnection
- Proctoring alert
- Session termination

Audit history is immutable.

---

# Analytics

Track:

- Session duration
- Completion rate
- Autosave frequency
- Device usage
- Drop-off rate
- Network interruptions
- Submission latency

---

# Performance

Support:

- Hundreds of thousands of concurrent candidates
- Horizontal scaling
- Load balancing
- Low latency
- High availability
- Disaster recovery

---

# Acceptance Criteria

✓ Secure assessment sessions

✓ Reliable autosave

✓ Offline recovery

✓ Flexible scheduling

✓ Configurable proctoring

✓ Accessibility support

✓ Result handoff

✓ Complete audit logging

---

# Future Enhancements

- AI adaptive delivery
- Voice-based assessments
- AR/VR practical assessments
- Real-time collaborative assessments
- Edge execution for remote environments
- Intelligent bandwidth optimization

---

# Guiding Principle

The Assessment Delivery Service exists to ensure every learner can complete assessments securely, reliably, fairly, and efficiently regardless of device, location, or network conditions while preserving academic integrity and educational accessibility.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**