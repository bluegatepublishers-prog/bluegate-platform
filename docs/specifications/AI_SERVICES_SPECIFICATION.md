# SARTHI AI Services Specification

**Version:** 1.0

**Status:** Draft

**Module:** AI Services

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The AI Services Platform provides a centralized, provider-neutral artificial intelligence layer for SARTHI.

Rather than embedding AI separately into each module, all AI capabilities are delivered through shared services that ensure consistency, governance, security, cost control, and continuous improvement.

---

# Vision

The AI Services Platform shall become the trusted intelligence engine powering every educational workflow while ensuring human oversight, transparency, privacy, and responsible AI usage.

---

# Design Principles

The AI Platform shall be:

- Provider Neutral
- Human Controlled
- Privacy First
- Explainable
- Auditable
- Modular
- Secure
- Cost Efficient
- Continuously Improving

AI assists people.

AI never replaces professional educational judgment.

---

# AI Architecture

```
Application Layer
│
├── Teacher Platform
├── Student Platform
├── Parent Platform
├── Publisher Platform
├── School ERP
├── Coaching ERP
├── University Platform
└── Marketplace
        │
        ▼
AI Gateway
        │
        ├── Prompt Service
        ├── Knowledge Service
        ├── Content Generation
        ├── Recommendation Engine
        ├── Moderation Service
        ├── Safety Layer
        ├── Usage Management
        └── Analytics
        │
        ▼
LLM Providers
(OpenAI, Anthropic, Gemini, Local Models, Future Providers)
```

---

# Core AI Services

The platform consists of:

1. AI Gateway
2. Prompt Management
3. Knowledge Retrieval
4. Content Generation
5. Recommendation Engine
6. Safety & Moderation
7. AI Analytics
8. Cost Management
9. AI Audit Service
10. Provider Management

---

# AI Gateway

Responsibilities:

- Provider abstraction
- Request routing
- Retry handling
- Timeout management
- Load balancing
- Fallback providers
- Response normalization

Applications communicate only with the AI Gateway.

---

# Prompt Management

Prompt management supports:

- Prompt templates
- Prompt versioning
- Prompt testing
- Prompt approvals
- Localization
- Prompt variables

Prompts are treated as versioned assets.

---

# Knowledge Retrieval

The Knowledge Service retrieves information from:

- Books
- Resources
- Curriculum
- Policies
- Institution data
- User permissions
- Learning history

Only authorized content may be retrieved.

---

# Retrieval-Augmented Generation (RAG)

The platform supports RAG by combining:

- User request
- Institution context
- Curriculum
- Resource library
- Relevant documents
- Conversation history (where appropriate)

Every retrieval respects tenant isolation and permissions.

---

# Content Generation

The platform may generate:

- Lesson Plans
- Worksheets
- Question Papers
- Assessments
- Study Notes
- Explanations
- Summaries
- Report Comments
- Certificates
- Emails
- Announcements
- Book Descriptions
- Metadata

Generated content always requires review before publication.

---

# Recommendation Engine

Recommendations include:

- Learning resources
- Books
- Courses
- Practice activities
- Assessments
- Teacher resources
- Professional development
- Marketplace products

Recommendations should explain why they were suggested.

---

# AI Teacher

Supports:

- Lesson planning
- Worksheet generation
- Question generation
- Classroom activities
- Differentiated instruction
- Remedial planning
- Rubrics
- Feedback drafting

Teachers approve final output.

---

# AI Student

Supports:

- Concept explanations
- Guided practice
- Revision plans
- Learning recommendations
- Study scheduling
- Progress insights

The AI Student must not complete graded assignments.

---

# AI Parent

Supports:

- Report interpretation
- Homework guidance
- Study planning
- School communication assistance

The AI Parent does not replace teachers or counselors.

---

# AI Publisher

Supports:

- Chapter outlines
- Metadata generation
- Question creation
- Curriculum mapping
- Editorial suggestions
- Accessibility improvements

Editorial approval remains mandatory.

---

# AI Administrator

Supports:

- Report generation
- Operational summaries
- Forecasting
- Trend analysis
- Dashboard insights

Operational decisions remain human-controlled.

---

# AI Safety

The platform includes:

- Prompt injection protection
- Output validation
- Harmful content detection
- Bias detection
- Hallucination checks
- Sensitive information filtering

Unsafe responses are blocked or flagged.

---

# Moderation

Moderation supports:

- User prompts
- AI responses
- Uploaded files
- Images
- Generated content

Moderation policies are centrally managed.

---

# Provider Management

Supported providers include:

- OpenAI
- Anthropic
- Google Gemini
- Azure OpenAI
- Local Models
- Future providers

Applications remain provider-independent.

---

# Cost Management

Track:

- Token usage
- Provider usage
- Department usage
- Institution usage
- User quotas
- Budget alerts
- Cost forecasting

Usage policies are configurable.

---

# AI Audit

Every AI interaction records:

- User
- Tenant
- Timestamp
- Prompt version
- Provider
- Model
- Token usage
- Result status
- Human approval (where applicable)

Sensitive prompts are handled according to privacy policies.

---

# Privacy

AI must respect:

- Tenant isolation
- Role permissions
- User consent
- Data minimization
- Regional regulations

Private institutional data is never exposed across tenants.

---

# Accessibility

AI services support:

- Voice input
- Voice output
- Screen readers
- Multiple languages
- Simplified explanations
- Adjustable reading levels

---

# Analytics

Track:

- Feature adoption
- User satisfaction
- Response quality
- Cost efficiency
- Error rates
- Safety incidents
- Model performance

Analytics should drive continuous improvement.

---

# Success Metrics

The AI Platform should improve:

- Teacher productivity
- Student engagement
- Content quality
- Administrative efficiency
- Learning outcomes
- Cost efficiency
- User trust

---

# Future Enhancements

Future capabilities may include:

- AI agents for long-running tasks
- Multimodal reasoning
- Voice-first tutoring
- AI-powered classroom observation
- Digital twins for curriculum planning
- Offline AI inference
- Federated learning for privacy-preserving improvements

---

# Guiding Principle

The AI Services Platform exists to augment human capability—not replace it. Every AI capability within SARTHI must be transparent, secure, auditable, and aligned with educational goals while keeping educators, learners, and institutions in control.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**