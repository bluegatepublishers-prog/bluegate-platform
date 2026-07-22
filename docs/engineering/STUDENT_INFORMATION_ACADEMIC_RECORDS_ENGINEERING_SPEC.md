# SARTHI Student Information & Academic Records Engineering Specification

**Version:** 4.0

**Status:** Engineering Ready

**Module:** Student Information & Academic Records

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Student Information & Academic Records platform maintains the complete academic history of every learner throughout their educational journey.

It provides a permanent learner profile containing enrollment history, academic performance, competencies, assessments, attendance summaries, achievements, certifications, portfolios, and progression records.

The platform serves as the authoritative academic record for each learner across institutions participating in SARTHI.

---

# Scope

The platform is responsible for:

- Student academic profile
- Permanent learner identity
- Enrollment history
- Subject registrations
- Academic transcripts
- Assessment records
- Competency records
- Learning outcome tracking
- Digital portfolio
- Certificates
- Achievements
- Graduation records
- Alumni records

---

# Design Principles

The platform shall be:

- Learner Centric
- Institution Independent
- Multi-Tenant
- Secure
- Immutable
- Version Controlled
- AI Ready
- Future Proof

---

# Architecture

```
Student Academic Record

├── Student Identity
├── Enrollment History
├── Academic Sessions
├── Subject Registrations
├── Assessments
├── Competencies
├── Learning Outcomes
├── Attendance Summary
├── Behaviour Records
├── Certificates
├── Achievements
├── Portfolio
├── Recommendations
└── Alumni Record
```

---

# Student Academic Identity

Every learner shall possess a permanent Student Academic Identity (SAID).

The SAID remains constant across:

- Schools
- Campuses
- Academic years
- Publishers
- Educational stages

Institution admission numbers remain local identifiers linked to the SAID.

---

# Student Profile

Maintain:

- Basic information
- Demographics
- Guardian relationships
- Academic preferences
- Accessibility requirements
- Language preferences
- Career interests

---

# Enrollment History

Maintain complete records of:

- Institutions
- Academic years
- Grades
- Sections
- Subjects
- Transfers
- Promotions
- Graduation

Historical records are never deleted.

---

# Subject Registration

Track:

- Required subjects
- Electives
- Additional courses
- Clubs
- Activities
- Vocational programs

---

# Academic Records

Maintain:

- Internal assessments
- Periodic tests
- Practical assessments
- Projects
- Final examinations
- Board examinations

Each assessment links to competencies and learning outcomes.

---

# Competency Profile

Track learner growth in:

- Subject competencies
- Critical thinking
- Creativity
- Communication
- Collaboration
- Digital literacy
- Problem solving
- Leadership

Competency progression is longitudinal.

---

# Learning Outcomes

Track:

- Achieved
- Partially achieved
- In progress
- Not assessed

Outcome history is retained.

---

# Attendance Summary

Store:

- Daily attendance
- Subject attendance
- Activity attendance
- Term summaries
- Annual summaries

---

# Behaviour & Wellbeing

Maintain:

- Positive observations
- Behaviour incidents
- Counselling records
- Recognition
- Wellness notes

Access is role controlled.

---

# Certificates

Support:

- Academic certificates
- Participation certificates
- Competition certificates
- Skill certifications
- Government certifications

Certificates are digitally verifiable.

---

# Digital Portfolio

Allow learners to store:

- Projects
- Presentations
- Artwork
- Videos
- Research
- AI creations
- Reflections
- Achievements

Portfolio ownership remains with the learner.

---

# Academic Transcript

Generate:

- Annual transcripts
- Multi-year transcripts
- Graduation transcript
- Competency transcript
- Portfolio summary

Transcripts are digitally signed.

---

# Progression

Track:

- Promotions
- Repetitions
- Transfers
- Graduation
- Certifications
- Alumni transition

---

# AI Readiness

Provide context for:

- Personalized tutoring
- Academic risk prediction
- Career guidance
- Scholarship recommendations
- Personalized study plans
- Learning analytics

---

# APIs

Examples:

GET /api/v1/students/{id}

GET /api/v1/students/{id}/transcript

GET /api/v1/students/{id}/portfolio

GET /api/v1/students/{id}/competencies

GET /api/v1/students/{id}/outcomes

POST /api/v1/students/{id}/certificates

---

# Security

Enforce:

- Tenant isolation
- Role-based permissions
- Encryption at rest
- Encryption in transit
- Audit logging

Sensitive learner data is protected.

---

# Audit Events

Generate events for:

- Student record created
- Transcript generated
- Certificate issued
- Portfolio updated
- Competency updated
- Academic record corrected
- Graduation recorded

Audit records are immutable.

---

# Analytics

Track:

- Academic growth
- Competency growth
- Learning outcome attainment
- Attendance trends
- Portfolio development
- Graduation rates
- Alumni progression

---

# Performance

Support:

- Millions of learners
- Lifelong academic records
- High-volume transcript generation
- Horizontal scaling
- High availability

---

# Acceptance Criteria

✓ Permanent learner identity

✓ Enrollment history

✓ Academic transcript

✓ Competency profile

✓ Digital portfolio

✓ Certificates

✓ AI-ready learner profile

✓ Complete audit logging

---

# Future Enhancements

- Blockchain-backed credential verification
- International transcript exchange
- Digital learner passport
- Skills graph
- Career readiness profile
- University application integration

---

# Guiding Principle

Every learner should have a secure, lifelong academic record that follows them throughout their educational journey, enabling institutions, educators, learners, and parents to access trusted, comprehensive, and meaningful academic information.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**