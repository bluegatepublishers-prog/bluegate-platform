# SARTHI Question Bank Service Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Question Bank Service

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Question Bank Service provides a centralized, versioned, curriculum-aligned repository for assessment items across the SARTHI platform.

Every assessment, worksheet, examination, AI-generated paper, and adaptive learning activity should retrieve questions from this service.

---

# Scope

The Question Bank Service is responsible for:

- Question authoring
- Version management
- Curriculum mapping
- Metadata management
- Difficulty calibration
- Blueprint support
- Randomization
- AI-assisted generation
- Review workflow
- Analytics
- Audit logging

---

# Design Principles

The Question Bank Service shall be:

- Curriculum Aligned
- Version Controlled
- Reusable
- Auditable
- AI Assisted
- Secure
- Scalable
- Provider Neutral

---

# Architecture

```
Assessment Platform

↓

Question Bank API

↓

Question Bank Service

├── Question Repository
├── Metadata Manager
├── Curriculum Mapper
├── Difficulty Engine
├── Blueprint Engine
├── AI Generation
├── Review Workflow
├── Version Manager
├── Analytics
└── Audit Logger

↓

Assessment Delivery Service
```

---

# Question Lifecycle

Draft

↓

Review

↓

Approved

↓

Published

↓

Available

↓

Updated

↓

Deprecated

↓

Archived

Every lifecycle transition generates audit events.

---

# Supported Question Types

Support:

- Multiple Choice
- Multiple Select
- True / False
- Fill in the Blank
- Match the Following
- Ordering
- Short Answer
- Long Answer
- Numerical
- Assertion & Reason
- Case Study
- Passage Based
- Diagram Based
- Image Annotation
- Audio Based
- Video Based
- Coding
- Practical Assessment
- AI Interactive Question

Question types are extensible.

---

# Question Structure

Each question contains:

- Question ID
- Version
- Stem
- Options
- Correct Answer
- Solution
- Explanation
- Hints
- Marks
- Negative Marks
- Time Estimate
- Difficulty
- Status
- Language

---

# Curriculum Mapping

Questions may map to:

- Curriculum
- Board
- Subject
- Grade
- Book
- Chapter
- Topic
- Sub-topic
- Learning Outcome
- Competency
- Bloom's Taxonomy
- NEP Competencies

Mappings support multiple curricula where applicable.

---

# Metadata

Store:

- Author
- Reviewer
- Publisher
- Tenant
- Institution
- Language
- Tags
- Keywords
- Usage Count
- Success Rate
- Last Used
- Creation Date
- Approval Date

Metadata supports advanced filtering.

---

# Difficulty Levels

Support:

- Very Easy
- Easy
- Medium
- Hard
- Very Hard

Difficulty may be manually assigned or statistically calibrated.

---

# Blueprint Integration

Questions support blueprint attributes:

- Topic Weight
- Cognitive Level
- Skill Category
- Marks Distribution
- Assessment Objective

Blueprints drive automated paper generation.

---

# AI Generation

AI may assist with:

- Draft question creation
- Distractor generation
- Explanation drafting
- Hint generation
- Difficulty estimation
- Metadata generation
- Translation

Human approval is required before publication.

---

# Randomization

Support:

- Question pools
- Topic balancing
- Difficulty balancing
- Blueprint compliance
- Duplicate prevention

Randomization remains reproducible using stored seeds where required.

---

# Review Workflow

Draft

↓

Peer Review

↓

Academic Review

↓

Approval

↓

Publication

↓

Availability

Rejected questions retain review history.

---

# Question Versioning

Support:

- Immutable published versions
- Draft revisions
- Rollback
- Comparison
- Change history

Historical versions remain available.

---

# APIs

Examples:

POST /api/v1/questions

GET /api/v1/questions/{id}

PATCH /api/v1/questions/{id}

POST /api/v1/questions/{id}/publish

POST /api/v1/questions/search

POST /api/v1/questions/random

GET /api/v1/questions/blueprint

---

# Security

Enforce:

- Tenant isolation
- Role permissions
- Approval permissions
- Encryption
- Audit logging

Only approved questions may be used in production assessments.

---

# Audit Events

Generate events for:

- Question creation
- Question update
- Version creation
- Review
- Approval
- Publication
- Retirement
- AI generation

---

# Analytics

Track:

- Usage frequency
- Difficulty accuracy
- Student success rate
- Discrimination index
- Average response time
- Blueprint coverage
- Curriculum coverage

Analytics support continuous improvement.

---

# Performance

Support:

- Millions of questions
- Fast metadata search
- Randomized retrieval
- Horizontal scaling
- High availability

---

# Acceptance Criteria

✓ Curriculum mapping

✓ Version management

✓ Blueprint support

✓ AI-assisted authoring

✓ Review workflow

✓ Randomized retrieval

✓ Rich analytics

✓ Complete audit logging

---

# Future Enhancements

- Item Response Theory (IRT)
- Computer Adaptive Testing (CAT)
- Automatic distractor quality scoring
- AI-powered psychometric analysis
- Collaborative authoring
- Cross-language question equivalence
- Multimedia simulation questions

---

# Guiding Principle

Every assessment question within SARTHI should be academically sound, curriculum-aligned, reusable, versioned, measurable, and continuously improved through analytics and expert review.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**