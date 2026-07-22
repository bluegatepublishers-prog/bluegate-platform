# SARTHI AI Gateway Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** AI Gateway

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The AI Gateway provides a centralized interface for every AI interaction within SARTHI.

Applications never communicate directly with Large Language Models (LLMs). Instead, they send requests through the AI Gateway, which applies routing, security, governance, moderation, context assembly, observability, and cost management.

---

# Scope

The AI Gateway is responsible for:

- Provider abstraction
- Model routing
- Prompt orchestration
- Context assembly
- Retrieval integration
- Safety validation
- Cost management
- Usage quotas
- Response normalization
- Audit logging
- Analytics

---

# Design Principles

The gateway shall be:

- Provider Neutral
- Secure
- Observable
- Auditable
- Scalable
- Modular
- Low Latency
- Cost Efficient

---

# Architecture

```
Applications

↓

AI Gateway API

↓

AI Gateway

├── Authentication
├── Authorization
├── Request Validation
├── Prompt Service
├── Context Builder
├── Knowledge Retrieval
├── Provider Router
├── Safety Layer
├── Response Validator
├── Cost Manager
├── Usage Tracker
├── Audit Logger
└── Analytics

↓

AI Providers
```

---

# Supported Providers

Examples:

- OpenAI
- Anthropic
- Google Gemini
- Azure OpenAI
- Local Models
- Enterprise Models

Provider implementations remain interchangeable.

---

# Request Pipeline

Client

↓

Authentication

↓

Authorization

↓

Quota Check

↓

Prompt Resolution

↓

Context Assembly

↓

Knowledge Retrieval

↓

Safety Validation

↓

Provider Routing

↓

Response Validation

↓

Usage Recording

↓

Audit

↓

Response

---

# Context Assembly

Context may include:

- User profile
- Role
- Tenant
- Curriculum
- Institution
- Learning history
- Permissions
- Resource metadata
- Previous conversation
- Retrieved documents

Only authorized information is included.

---

# Provider Routing

Routing may depend on:

- Cost
- Latency
- Availability
- Model capability
- Tenant policy
- Request type
- Subscription level

Routing decisions should be configurable.

---

# Request Types

Support:

- Chat
- Structured JSON
- Text Generation
- Summarization
- Classification
- Translation
- Question Generation
- Lesson Planning
- Assessment Creation
- Metadata Generation

New request types are extensible.

---

# Response Normalization

Responses include:

- Content
- Structured Output
- Citations (when available)
- Token Usage
- Model Information
- Processing Time
- Safety Metadata

Applications receive a consistent response format regardless of provider.

---

# Safety Layer

Validate:

- Prompt injection
- Data leakage
- Harmful content
- Sensitive information
- Unsupported requests
- Prompt size
- Context size

Unsafe requests are rejected or modified according to policy.

---

# Quotas

Support quotas for:

- User
- Role
- Tenant
- Organization
- Subscription
- API Key

Quota policies are configurable.

---

# Cost Management

Track:

- Prompt tokens
- Completion tokens
- Total tokens
- Provider cost
- Tenant cost
- User cost
- Daily usage
- Monthly usage

Budget alerts should be supported.

---

# Rate Limiting

Support:

- Per user
- Per tenant
- Per organization
- Per API key
- Global platform limits

---

# Fallback Strategy

If a provider fails:

- Retry
- Route to backup provider
- Return graceful error
- Record failure
- Trigger monitoring alert

---

# APIs

Examples:

POST /api/v1/ai/chat

POST /api/v1/ai/generate

POST /api/v1/ai/summarize

POST /api/v1/ai/classify

POST /api/v1/ai/translate

GET /api/v1/ai/models

GET /api/v1/ai/usage

---

# Security

Enforce:

- Authentication
- Authorization
- Tenant isolation
- Encryption
- Rate limiting
- Audit logging

No provider credentials are exposed outside the gateway.

---

# Audit Events

Generate events for:

- AI request
- AI response
- Provider selection
- Quota exceeded
- Safety rejection
- Fallback activation
- Configuration changes

---

# Observability

Capture:

- Latency
- Error rates
- Provider health
- Retry counts
- Token consumption
- Request volume
- Success rate

Metrics integrate with Monitoring & Observability.

---

# Performance

Support:

- Thousands of concurrent requests
- Horizontal scaling
- Provider failover
- Streaming responses
- Request batching
- Low latency

---

# Acceptance Criteria

✓ Provider abstraction

✓ Unified API

✓ Context assembly

✓ Safety validation

✓ Usage tracking

✓ Quota management

✓ Cost tracking

✓ Complete audit logging

---

# Future Enhancements

- Multi-model orchestration
- Agent-to-agent communication
- Automatic model benchmarking
- Dynamic cost optimization
- Edge AI inference
- On-premise model routing
- Federated AI execution

---

# Guiding Principle

Every AI interaction within SARTHI should pass through a single, trusted gateway that ensures security, consistency, observability, governance, and provider independence while delivering the best possible experience for learners, educators, and institutions.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**