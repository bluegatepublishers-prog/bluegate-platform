# SARTHI Event Bus Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Event Bus

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Event Bus provides a centralized event-driven communication infrastructure for all SARTHI platform services.

It enables asynchronous messaging, event publication, event consumption, workflow orchestration, notifications, analytics ingestion, audit collection, and external integrations without creating tight coupling between services.

---

# Scope

The Event Bus is responsible for:

- Event publishing
- Event routing
- Event delivery
- Topic management
- Event subscriptions
- Retry management
- Dead-letter queues
- Event replay
- Event ordering
- Event retention
- Observability
- Audit logging

---

# Design Principles

The Event Bus shall be:

- Event Driven
- Loosely Coupled
- Reliable
- Scalable
- Fault Tolerant
- Observable
- Secure
- Tenant Aware

---

# Architecture

```
Platform Services

↓

Event Publisher

↓

SARTHI Event Bus

├── Topic Manager
├── Event Router
├── Subscription Manager
├── Delivery Manager
├── Retry Engine
├── Dead Letter Queue
├── Replay Manager
├── Retention Manager
├── Monitoring
└── Audit Logger

↓

Event Consumers

↓

Platform Services
```

---

# Event Producers

Events may originate from:

- Identity Service
- Multi-Tenant Engine
- Teacher Platform
- Student Platform
- Parent Platform
- School Platform
- Publisher Platform
- Marketplace
- Payment Engine
- Subscription Engine
- Licensing Engine
- Assessment Delivery
- Evaluation
- Question Bank
- AI Gateway
- Workflow Engine
- Notification Service
- Reporting Engine
- Audit Engine
- Integration Framework

---

# Event Consumers

Consumers may include:

- Analytics Warehouse
- Notification Service
- Workflow Engine
- Reporting Engine
- Audit Engine
- AI Gateway
- Integration Framework
- Marketplace
- Monitoring Platform
- External Systems

---

# Event Categories

Support:

- User Events
- Academic Events
- Assessment Events
- Evaluation Events
- AI Events
- Commerce Events
- Financial Events
- Licensing Events
- Subscription Events
- Notification Events
- Reporting Events
- Security Events
- Infrastructure Events

Categories remain extensible.

---

# Event Structure

Every event contains:

- Event ID
- Event Type
- Event Version
- Schema Version
- Correlation ID
- Tenant ID
- Organization ID
- Resource ID
- Producer
- Timestamp (UTC)
- Payload
- Metadata

Event contracts are immutable once published.

---

# Topics

Support:

- Global topics
- Tenant topics
- Service topics
- Broadcast topics
- Internal topics
- External topics

Topic naming follows platform standards.

---

# Event Delivery

Support:

- At-least-once delivery
- Ordered delivery where required
- Configurable acknowledgment
- Retry policies
- Consumer groups

Delivery guarantees are configurable.

---

# Retry Management

Support:

- Immediate retry
- Delayed retry
- Exponential backoff
- Maximum retry limits

Retries remain observable.

---

# Dead-Letter Queue

Undeliverable events move to a DLQ.

Support:

- Inspection
- Replay
- Permanent archival
- Root cause analysis

No event is silently discarded.

---

# Event Replay

Support replay by:

- Event ID
- Topic
- Time range
- Tenant
- Correlation ID

Replay operations are audited.

---

# Event Retention

Retention policies support:

- Short-term operational events
- Long-term analytical events
- Compliance retention
- Tenant-specific policies

Expired events follow archival rules.

---

# Event Versioning

Support:

- Schema evolution
- Backward compatibility
- Consumer compatibility
- Deprecation policy

Breaking changes require new event versions.

---

# APIs

Examples:

POST /api/v1/events

GET /api/v1/events/{id}

POST /api/v1/events/replay

GET /api/v1/topics

POST /api/v1/subscriptions

GET /api/v1/subscriptions

---

# Security

Enforce:

- Authentication
- Authorization
- Tenant isolation
- Event signing
- Encryption
- Audit logging

Only authorized producers and consumers may participate.

---

# Audit Events

Generate events for:

- Event published
- Event delivered
- Delivery failure
- Retry
- Replay
- Subscription created
- Subscription removed
- DLQ entry

Audit records are immutable.

---

# Monitoring

Monitor:

- Event throughput
- Delivery latency
- Consumer lag
- Retry volume
- DLQ size
- Topic health
- Producer health
- Consumer health

Metrics integrate with Monitoring & Observability.

---

# Performance

Support:

- Millions of events per minute
- Horizontal scaling
- Multi-region deployment
- High availability
- Low-latency routing

---

# Acceptance Criteria

✓ Reliable event publication

✓ Topic management

✓ Subscription management

✓ Retry engine

✓ Dead-letter queues

✓ Replay support

✓ Monitoring

✓ Complete audit logging

---

# Future Enhancements

- Event mesh federation
- Cross-region event replication
- AI-assisted event anomaly detection
- Event schema registry
- Event governance portal
- Self-service event subscriptions

---

# Guiding Principle

Every significant change within SARTHI should be represented as a durable domain event, enabling scalable, loosely coupled, observable, and resilient communication across the entire platform.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**