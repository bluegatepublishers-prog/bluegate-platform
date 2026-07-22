# SARTHI Education Domain Model Engineering Specification

**Version:** 4.0

**Status:** Engineering Ready

**Module:** Education Domain Model

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Education Domain Model defines the canonical academic structure used throughout SARTHI.

It standardizes educational concepts such as curricula, boards, grades, subjects, competencies, learning outcomes, academic calendars, and educational pathways, ensuring that every service speaks the same educational language.

The domain model is the foundation for all academic functionality within the platform.

---

# Scope

The Education Domain Model is responsible for:

- Academic hierarchy
- Curriculum management
- Board management
- Grade and class structure
- Subject taxonomy
- Chapter and topic organization
- Learning outcomes
- Competencies
- Academic calendars
- Educational pathways
- Cross-curriculum mapping

---

# Design Principles

The model shall be:

- Curriculum Agnostic
- Board Agnostic
- Country Aware
- Extensible
- Version Controlled
- Multi-Tenant
- AI Ready
- Future Proof

---

# Architecture

```
Education Domain

├── Country
├── Education System
├── Board
├── Curriculum
├── Academic Year
├── Grade
├── Section
├── Subject
├── Unit
├── Chapter
├── Topic
├── Sub-topic
├── Competency
├── Learning Outcome
├── Assessment Blueprint
└── Resource Mapping
```

---

# Academic Hierarchy

Support the following hierarchy:

Country

↓

Education System

↓

Board

↓

Curriculum

↓

Academic Year

↓

Grade

↓

Section

↓

Subject

↓

Unit

↓

Chapter

↓

Topic

↓

Sub-topic

---

# Education Systems

Support:

- School Education
- Higher Education
- Vocational Education
- Coaching
- Corporate Learning
- Professional Certification
- Government Training

Education systems remain configurable.

---

# Boards

Examples:

- CBSE
- CISCE
- State Boards
- IB
- Cambridge
- NIOS
- Custom Institutional Boards

Boards are tenant configurable where appropriate.

---

# Curriculum

A curriculum defines:

- Subjects
- Learning sequence
- Competencies
- Outcomes
- Assessment patterns
- Academic policies

Curricula are version-controlled.

---

# Academic Calendar

Support:

- Academic years
- Terms
- Semesters
- Trimesters
- Sessions
- Holidays
- Examination windows

Calendars are institution-specific.

---

# Subjects

Each subject includes:

- Subject ID
- Code
- Name
- Description
- Grade applicability
- Curriculum mapping
- Assessment policy

---

# Learning Outcomes

Each learning outcome contains:

- Outcome ID
- Statement
- Competency mapping
- Grade
- Subject
- Topic
- Bloom's level

Learning outcomes are measurable.

---

# Competencies

Support competency frameworks such as:

- NEP competencies
- Bloom's Taxonomy
- Critical Thinking
- Creativity
- Communication
- Collaboration
- Digital Literacy
- Problem Solving

Competency frameworks are extensible.

---

# Educational Pathways

Support learner progression across:

- Grades
- Subjects
- Courses
- Certifications
- Skills
- Careers

Pathways may branch based on learner choices.

---

# Resource Mapping

Resources may map to:

- Curriculum
- Grade
- Subject
- Topic
- Competency
- Learning Outcome
- Assessment

Multiple mappings are supported.

---

# Assessment Mapping

Every assessment references:

- Curriculum
- Grade
- Subject
- Competencies
- Learning Outcomes
- Blueprint

This enables standards-based evaluation.

---

# AI Readiness

Provide structured educational context for:

- AI tutoring
- Question generation
- Lesson planning
- Personalized learning
- Adaptive pathways
- Learning analytics

---

# APIs

Examples:

GET /api/v1/education/boards

GET /api/v1/education/curricula

GET /api/v1/education/grades

GET /api/v1/education/subjects

GET /api/v1/education/outcomes

GET /api/v1/education/competencies

---

# Security

Enforce:

- Tenant isolation
- Version validation
- Curriculum governance
- Audit logging

---

# Audit Events

Generate events for:

- Curriculum created
- Curriculum published
- Subject updated
- Learning outcome modified
- Competency framework published
- Academic calendar updated

---

# Analytics

Track:

- Curriculum coverage
- Outcome coverage
- Competency coverage
- Resource alignment
- Assessment alignment
- Learning progression

---

# Performance

Support:

- Millions of educational entities
- Fast hierarchical queries
- Horizontal scaling
- High availability

---

# Acceptance Criteria

✓ Canonical academic hierarchy

✓ Curriculum versioning

✓ Learning outcome framework

✓ Competency framework

✓ Resource mapping

✓ Assessment alignment

✓ AI-ready educational context

✓ Complete audit logging

---

# Future Enhancements

- International curriculum interoperability
- Skills graph
- Competency graph
- Career pathway graph
- Cross-board equivalency mapping
- AI-generated curriculum recommendations

---

# Guiding Principle

Every educational capability within SARTHI should rely on a single, canonical education domain model so that curricula, learning outcomes, assessments, resources, analytics, and AI services remain consistent, interoperable, and future-ready.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**