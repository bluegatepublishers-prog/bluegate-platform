# SARTHI Evaluation Service Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Evaluation Service

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Evaluation Service provides centralized grading, scoring, moderation, and result calculation for all assessments executed within SARTHI.

It supports automatic evaluation, manual marking, AI-assisted evaluation, moderation, statistical analysis, and result publishing.

---

# Scope

The Evaluation Service is responsible for:

- Automatic grading
- Manual evaluation
- AI-assisted evaluation
- Rubric-based marking
- Moderation
- Re-evaluation
- Result calculation
- Grade calculation
- Analytics
- Audit logging

---

# Design Principles

The service shall be:

- Fair
- Transparent
- Consistent
- Auditable
- Configurable
- Explainable
- Scalable
- Secure

---

# Architecture

```
Assessment Delivery

↓

Evaluation API

↓

Evaluation Service

├── Submission Loader
├── Auto Grading Engine
├── Rubric Engine
├── Manual Evaluation
├── AI Evaluation Assistant
├── Moderation Engine
├── Grade Calculator
├── Result Publisher
├── Analytics
└── Audit Logger

↓

Results Repository
```

---

# Evaluation Lifecycle

Submitted

↓

Queued

↓

Automatic Evaluation

↓

Manual Evaluation (if required)

↓

Moderation

↓

Grade Calculation

↓

Result Verification

↓

Published

↓

Archived

---

# Supported Evaluation Types

Support:

- Fully Automatic
- Fully Manual
- Hybrid
- Rubric Based
- Competency Based
- AI Assisted
- Practical Evaluation
- Viva Evaluation
- Peer Evaluation
- Self Evaluation

Evaluation strategies are configurable.

---

# Automatic Evaluation

Support:

- MCQ
- Multiple Select
- True/False
- Fill in the Blank
- Numerical
- Matching
- Ordering

Automatic grading rules are versioned.

---

# Manual Evaluation

Evaluators may:

- Assign marks
- Leave comments
- Highlight answers
- Apply rubrics
- Override AI suggestions
- Save drafts
- Submit final evaluation

Every action is audited.

---

# Rubric Engine

Support:

- Criterion-based marking
- Weighted criteria
- Competency scoring
- Descriptors
- Performance levels
- Custom institutional rubrics

Rubrics are reusable and version-controlled.

---

# AI Evaluation Assistant

AI may assist with:

- Suggested marks
- Feedback drafting
- Rubric mapping
- Grammar analysis
- Consistency checks
- Flagging incomplete answers

Final marks require human approval where institutional policy requires it.

---

# Moderation

Support:

- Single moderation
- Double evaluation
- Blind evaluation
- Sample moderation
- Department moderation
- External moderation

Moderation policies are configurable.

---

# Re-evaluation

Support:

- Student request
- Teacher request
- Administrator request
- Automatic trigger

Previous evaluation history remains preserved.

---

# Grade Calculation

Support:

- Percentage
- GPA
- Letter Grade
- Competency Levels
- Pass/Fail
- Institution-specific grading scales

Grade calculations are version-controlled.

---

# Result Publishing

Results may be:

- Immediate
- Scheduled
- Approval-based
- Institution-controlled

Published results become available to authorized users.

---

# Feedback

Students may receive:

- Marks
- Correct answers (where allowed)
- Explanations
- Rubric feedback
- Teacher comments
- Improvement suggestions

Feedback visibility is configurable.

---

# APIs

Examples:

POST /api/v1/evaluations/start

GET /api/v1/evaluations/{id}

PATCH /api/v1/evaluations/{id}

POST /api/v1/evaluations/{id}/moderate

POST /api/v1/evaluations/{id}/publish

GET /api/v1/results/{assessmentId}

---

# Security

Enforce:

- Tenant isolation
- Role validation
- Evaluator permissions
- Encryption
- Audit logging

Only authorized evaluators may modify results.

---

# Audit Events

Generate events for:

- Evaluation started
- Marks updated
- AI suggestion generated
- Moderation completed
- Re-evaluation requested
- Result published
- Grade override

Audit records are immutable.

---

# Analytics

Track:

- Evaluation time
- AI agreement rate
- Moderator agreement
- Grade distribution
- Rubric usage
- Question performance
- Evaluator workload

Analytics support quality assurance.

---

# Performance

Support:

- Millions of submissions
- Parallel grading
- Horizontal scaling
- Low-latency result calculation
- High availability

---

# Acceptance Criteria

✓ Automatic grading

✓ Manual evaluation

✓ Rubric support

✓ AI-assisted evaluation

✓ Moderation workflows

✓ Configurable grading scales

✓ Result publishing

✓ Complete audit logging

---

# Future Enhancements

- AI-powered rubric generation
- Psychometric scoring
- Handwriting recognition
- Mathematical expression recognition
- Programming code execution
- Multimedia response evaluation
- Adaptive feedback generation

---

# Guiding Principle

Every learner deserves fair, transparent, explainable, and auditable evaluation. The Evaluation Service ensures assessment results are accurate, trustworthy, configurable, and aligned with institutional academic policies.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**