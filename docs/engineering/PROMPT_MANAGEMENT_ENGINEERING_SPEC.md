# SARTHI Prompt Management Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Prompt Management Service

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Prompt Management Service provides centralized lifecycle management for every AI prompt used throughout the SARTHI platform.

Rather than embedding prompts within application code, prompts are stored, versioned, reviewed, tested, localized, and deployed through this service.

---

# Scope

The Prompt Management Service is responsible for:

- Prompt repository
- Prompt versioning
- Prompt templates
- Variables
- Prompt testing
- Prompt approvals
- Localization
- Prompt analytics
- Rollback
- Prompt publishing

---

# Design Principles

The Prompt Management Service shall be:

- Version Controlled
- Reusable
- Auditable
- Provider Neutral
- Secure
- Testable
- Configurable
- Modular

---

# Architecture

```
Applications

↓

AI Gateway

↓

Prompt Management

├── Prompt Repository
├── Template Engine
├── Variable Resolver
├── Version Manager
├── Approval Workflow
├── Test Engine
├── Localization
├── Deployment Manager
├── Analytics
└── Audit Service

↓

AI Gateway
```

---

# Prompt Repository

Each prompt contains:

- Prompt ID
- Name
- Description
- Owner
- Category
- Module
- Status
- Version
- Language
- Tags
- Creation Date
- Last Updated

---

# Prompt Categories

Examples:

- Lesson Planning
- Worksheet Generation
- Assessment Generation
- Question Generation
- Translation
- Summarization
- Classification
- Metadata Generation
- Recommendation
- Report Writing
- Parent Communication

Categories are configurable.

---

# Prompt Templates

Support:

- System Prompt
- User Prompt
- Assistant Prompt
- Context Blocks
- Output Instructions
- Validation Rules

Templates are reusable across modules.

---

# Variables

Variables support:

- User Name
- Institution
- Class
- Subject
- Grade
- Curriculum
- Language
- Learning Objectives
- Assessment Type
- Chapter
- AI Configuration

Variables are validated before execution.

---

# Prompt Versioning

Every prompt supports:

- Draft
- Review
- Approved
- Published
- Deprecated
- Archived

Previous versions remain immutable.

---

# Approval Workflow

Prompt publication requires:

Draft

↓

Review

↓

Testing

↓

Approval

↓

Published

↓

Available

Emergency rollback is supported.

---

# Prompt Testing

Support automated testing for:

- Variable validation
- JSON schema validation
- Output structure
- Hallucination detection
- Safety compliance
- Prompt performance
- Regression testing

Test suites should be repeatable.

---

# Localization

Support:

- Multiple languages
- Regional variants
- Institution-specific terminology
- Curriculum-specific terminology

Fallback language is configurable.

---

# Output Contracts

Each prompt may define:

- Expected schema
- Required fields
- Optional fields
- Validation rules
- Maximum response size

Applications validate outputs before use.

---

# Prompt Deployment

Deployment supports:

- Draft
- Staging
- Production
- Canary rollout
- Rollback

Deployments are version-aware.

---

# Prompt Analytics

Track:

- Usage count
- Success rate
- Failure rate
- User satisfaction
- Average latency
- Token consumption
- Provider performance

Analytics inform prompt improvements.

---

# APIs

Examples:

GET /api/v1/prompts

POST /api/v1/prompts

GET /api/v1/prompts/{id}

PATCH /api/v1/prompts/{id}

POST /api/v1/prompts/{id}/publish

POST /api/v1/prompts/{id}/rollback

POST /api/v1/prompts/{id}/test

---

# Security

Enforce:

- Tenant isolation
- Role permissions
- Prompt ownership
- Audit logging
- Encryption

Only authorized users may modify prompts.

---

# Audit Events

Generate events for:

- Prompt creation
- Prompt update
- Version creation
- Approval
- Publication
- Rollback
- Test execution
- Localization update

Audit history is immutable.

---

# Performance

Support:

- Thousands of prompt executions per minute
- Cached prompt retrieval
- Version-aware caching
- Horizontal scaling
- Low-latency resolution

---

# Acceptance Criteria

✓ Central prompt repository

✓ Version management

✓ Variable resolution

✓ Approval workflow

✓ Automated testing

✓ Localization

✓ Analytics

✓ Rollback support

✓ Complete audit logging

---

# Future Enhancements

- AI-assisted prompt optimization
- Automatic A/B testing
- Prompt quality scoring
- Prompt dependency analysis
- Prompt marketplace
- Visual prompt editor

---

# Guiding Principle

Prompts are strategic platform assets. Every AI capability within SARTHI should execute approved, versioned, tested, and auditable prompts managed through a centralized Prompt Management Service.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**