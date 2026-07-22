# SARTHI Subscription Engine Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Subscription Engine

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Subscription Engine manages subscription plans, entitlements, renewals, billing cycles, feature availability, quotas, and lifecycle management for all SARTHI products.

The engine determines what a customer is entitled to use. It does not process payments directly; payment processing is delegated to the Payment Engine.

---

# Scope

The Subscription Engine is responsible for:

- Subscription plans
- Plan versions
- Billing cycles
- Trials
- Renewals
- Upgrades
- Downgrades
- Entitlements
- Usage quotas
- Seat management
- Subscription lifecycle
- Analytics
- Audit logging

---

# Design Principles

The Subscription Engine shall be:

- Product Independent
- Payment Independent
- Tenant Aware
- Version Controlled
- Configurable
- Auditable
- Scalable
- Event Driven

---

# Architecture

```
Applications

↓

Subscription API

↓

Subscription Engine

├── Plan Manager
├── Entitlement Manager
├── Usage Meter
├── Renewal Manager
├── Trial Manager
├── Seat Manager
├── Billing Cycle Manager
├── Analytics
└── Audit Logger

↓

Payment Engine
```

---

# Subscription Lifecycle

Draft

↓

Published

↓

Trial (optional)

↓

Active

↓

Renewing

↓

Expired

↓

Grace Period

↓

Suspended

↓

Cancelled

↓

Archived

---

# Plan Types

Support:

- Free
- Trial
- Monthly
- Quarterly
- Half-Yearly
- Annual
- Multi-Year
- Lifetime
- Institutional
- Enterprise
- Custom Contract

Plans are extensible.

---

# Subscriber Types

Support subscriptions for:

- Individual Students
- Parents
- Teachers
- Schools
- Colleges
- Universities
- Coaching Institutes
- Publishers
- Corporate Customers
- Government Organizations

---

# Plan Structure

Each plan includes:

- Plan ID
- Version
- Name
- Description
- Billing Cycle
- Currency
- Included Features
- Seat Limits
- Usage Quotas
- Trial Eligibility
- Renewal Rules
- Status

---

# Entitlements

Entitlements determine access to:

- AI Features
- Assessments
- Courses
- Teacher Resources
- Reports
- Analytics
- Marketplace Purchases
- API Access
- Storage Limits
- User Limits

Entitlements are evaluated in real time.

---

# Usage Quotas

Support quotas for:

- AI Requests
- Assessments
- Downloads
- Uploads
- Storage
- API Calls
- Active Users
- Schools
- Classes
- Students
- Teachers

Quota definitions are version-controlled.

---

# Seat Management

Support:

- Assigned seats
- Unassigned seats
- Seat transfers
- Additional seat purchases
- Seat expiration

Seats may be user-based or concurrent, depending on plan configuration.

---

# Trials

Support:

- Free trial
- Feature-limited trial
- Time-limited trial
- Invitation trial

Trial eligibility rules are configurable.

---

# Renewals

Support:

- Automatic renewal
- Manual renewal
- Scheduled renewal
- Renewal reminders

Renewal events integrate with the Payment Engine.

---

# Upgrades and Downgrades

Support:

- Immediate upgrade
- Scheduled downgrade
- Prorated billing
- Contract migration

Historical plan assignments remain preserved.

---

# Billing Cycles

Support:

- Monthly
- Quarterly
- Half-Yearly
- Annual
- Custom enterprise cycle

Billing schedules are configurable.

---

# APIs

Examples:

GET /api/v1/subscriptions

POST /api/v1/subscriptions

GET /api/v1/subscriptions/{id}

POST /api/v1/subscriptions/{id}/upgrade

POST /api/v1/subscriptions/{id}/renew

GET /api/v1/entitlements

---

# Security

Enforce:

- Tenant isolation
- Plan validation
- Entitlement validation
- Encryption
- Audit logging

Applications never bypass entitlement checks.

---

# Audit Events

Generate events for:

- Plan created
- Plan updated
- Subscription activated
- Trial started
- Upgrade
- Downgrade
- Renewal
- Expiration
- Suspension
- Cancellation

Audit records are immutable.

---

# Analytics

Track:

- Active subscriptions
- Renewal rate
- Churn rate
- Trial conversion
- Seat utilization
- Feature adoption
- Quota usage
- Revenue attribution

---

# Performance

Support:

- Millions of subscriptions
- Real-time entitlement checks
- Horizontal scaling
- High availability
- Event-driven synchronization

---

# Acceptance Criteria

✓ Plan management

✓ Subscription lifecycle

✓ Entitlement evaluation

✓ Usage quotas

✓ Seat management

✓ Renewal workflows

✓ Analytics

✓ Complete audit logging

---

# Future Enhancements

- Family subscriptions
- Campus-wide licensing
- Dynamic usage-based pricing
- AI-generated upgrade recommendations
- Cross-tenant subscription federation
- Educational consortium licensing

---

# Guiding Principle

The Subscription Engine ensures that every learner, educator, institution, and organization receives the correct capabilities, limits, and services according to their active subscription while remaining flexible enough to support future business models.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**