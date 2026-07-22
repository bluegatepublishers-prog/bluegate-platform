# SARTHI AI Architecture

**Version:** 1.0

**Status:** Draft

**Product:** SARTHI

**Related Documents:**
- SARTHI Constitution
- Master PRD
- System Architecture
- Identity Architecture
- Multi-Tenant Architecture

---

# Purpose

This document defines the Artificial Intelligence architecture of SARTHI.

Artificial Intelligence is a platform capability rather than a standalone feature. Every AI service must enhance education while respecting privacy, security, academic integrity, and institutional policies.

---

# Vision

SARTHI AI exists to assist learners, educators, institutions, publishers, and administrators through intelligent, responsible, and explainable AI.

AI should improve education—not replace teachers or educational judgment.

---

# Guiding Principles

The AI platform shall follow these principles:

- Human-Centered
- Educationally Responsible
- Privacy by Design
- Transparent
- Auditable
- Provider Neutral
- Secure
- Multi-Tenant Aware
- Explainable where practical
- Continuously Improving

---

# AI Platform Goals

The AI platform should:

- Improve learning outcomes.
- Reduce teacher workload.
- Increase content quality.
- Personalize learning.
- Assist institutional decision-making.
- Support educational publishing.
- Enable responsible automation.

---

# AI Architecture

```
+-------------------------------+
|        User Applications      |
+---------------+---------------+
                |
                |
+---------------v---------------+
|      AI Orchestration Layer   |
+---------------+---------------+
                |
      +---------+---------+
      |                   |
+-----v------+     +------v------+
| Prompt     |     | Knowledge   |
| Builder    |     | Retrieval   |
+------------+     +-------------+
      |                   |
      +---------+---------+
                |
+---------------v---------------+
|     AI Provider Interface      |
+---------------+---------------+
                |
     +----------+----------+
     |                     |
OpenAI      Future Providers
```

---

# AI Layers

## User Layer

Provides AI experiences inside:

- Teacher Dashboard
- Student Dashboard
- Parent Portal
- Publisher Portal
- School Dashboard
- Admin Portal

---

## Orchestration Layer

Responsible for:

- Request validation
- Context assembly
- Prompt creation
- Provider selection
- Safety checks
- Usage tracking
- Error handling

---

## Provider Layer

AI providers should be replaceable.

Examples:

- OpenAI
- Azure OpenAI
- Anthropic
- Google
- Local LLMs

The application should depend on an internal provider interface rather than a specific vendor.

---

# AI Assistants

## AI Teacher

Supports:

- Lesson planning
- Worksheet generation
- Question paper generation
- Assessment design
- Rubrics
- Classroom activities
- Teaching suggestions

---

## AI Student

Supports:

- Personalized explanations
- Practice questions
- Revision plans
- Concept clarification
- Learning recommendations
- Goal tracking

---

## AI Parent

Supports:

- Progress summaries
- Learning recommendations
- Home learning guidance
- Attendance insights

---

## AI Publisher

Supports:

- Book review
- Editorial assistance
- Curriculum mapping
- Metadata generation
- Resource classification
- Quality analysis

---

## AI Administrator

Supports:

- Reports
- Operational insights
- Usage analysis
- Platform monitoring
- Recommendation summaries

---

# Prompt Management

Prompts should:

- Be version controlled.
- Be reusable.
- Support localization.
- Include educational context.
- Be reviewed before release.

Prompt templates should never contain sensitive tenant information unless required and authorized.

---

# Knowledge Sources

AI may use:

- Platform data
- Approved books
- Teacher resources
- Institution resources
- User context
- Curriculum metadata

Only authorized data should be used.

---

# Tenant Isolation

AI must respect tenant boundaries.

The AI service must never expose another tenant's:

- Books
- Resources
- Assessments
- Reports
- Internal documents
- Personal information

unless explicitly shared through supported collaboration features.

---

# Personalization

AI responses may consider:

- Age
- Grade
- Subject
- Language
- Curriculum
- Learning history
- Accessibility preferences

Personalization should improve relevance while respecting privacy.

---

# Safety

The AI platform should include:

- Prompt validation
- Content moderation
- Abuse detection
- Rate limiting
- Output validation
- Logging
- Error recovery

Unsafe or harmful outputs should be blocked or reviewed.

---

# Human Review

AI-generated educational content should support review before publication or high-stakes use.

Examples:

- Question papers
- Official assessments
- Report cards
- Certificates

Teachers and authorized staff remain responsible for final approval.

---

# Usage Tracking

The platform should record:

- Requests
- Tokens (where applicable)
- Processing time
- Success or failure
- Provider used
- Cost estimates
- Feedback

Usage metrics support monitoring and optimization.

---

# Privacy

AI services should process only the information necessary for the requested task.

Personal information should not be retained by providers beyond configured policies.

The platform should clearly identify AI-generated content where appropriate.

---

# Future AI Capabilities

Future services may include:

- Voice tutoring
- Image understanding
- Video analysis
- Interactive simulations
- Adaptive learning paths
- AI classroom assistants
- AI research assistants
- Multi-language tutoring
- Offline AI models
- Institution-specific AI knowledge bases

---

# Guiding Principle

Artificial Intelligence is an educational assistant.

It supports teachers, empowers learners, assists institutions, and improves educational quality while remaining secure, transparent, and under human oversight.

Every AI capability must align with the SARTHI Constitution and prioritize educational benefit over automation.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**