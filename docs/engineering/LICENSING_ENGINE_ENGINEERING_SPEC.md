# SARTHI Licensing Engine Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Licensing Engine

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Licensing Engine centrally manages digital and institutional licenses across the SARTHI ecosystem.

It determines how educational products may be accessed, by whom, under what conditions, and for what duration while remaining independent from subscriptions and payments.

---

# Scope

The Licensing Engine is responsible for:

- License creation
- License activation
- License validation
- License assignment
- Seat allocation
- Device management
- Institutional licensing
- Offline license support
- License transfer
- Compliance monitoring
- Revocation
- Audit logging

---

# Design Principles

The Licensing Engine shall be:

- Product Independent
- Tenant Aware
- Secure
- Auditable
- Offline Capable
- Extensible
- Version Controlled
- Event Driven

---

# Architecture

```
Applications

↓

Licensing API

↓

Licensing Engine

├── License Manager
├── Activation Manager
├── Validation Service
├── Seat Manager
├── Device Registry
├── Offline License Manager
├── Compliance Monitor
├── Analytics
└── Audit Logger

↓

Protected Products
```

---

# License Lifecycle

Generated

↓

Issued

↓

Activated

↓

Active

↓

Renewed

↓

Transferred

↓

Suspended

↓

Revoked

↓

Expired

↓

Archived

---

# License Types

Support:

- Individual
- Teacher
- Student
- Parent
- Classroom
- School
- District
- University
- Enterprise
- Government
- Lifetime
- Time-limited
- Evaluation
- Trial

License types remain extensible.

---

# Protected Assets

Licenses may protect:

- eBooks
- Videos
- Worksheets
- AI Services
- Assessments
- Reports
- Teacher Resources
- Digital Courses
- API Access
- Marketplace Purchases

---

# License Structure

Each license contains:

- License ID
- License Key
- Version
- Product ID
- Customer ID
- Tenant ID
- Issue Date
- Expiration Date
- Status
- Seat Count
- Activation Limit

---

# Activation

Support:

- Online activation
- QR activation
- Activation code
- Bulk institutional activation
- Automatic provisioning

Every activation is recorded.

---

# Validation

Validation verifies:

- License status
- Expiration
- Product eligibility
- Device eligibility
- Seat availability
- Subscription dependencies
- Organizational eligibility

Validation responses are deterministic.

---

# Seat Management

Support:

- Named users
- Floating seats
- Concurrent seats
- Classroom pools
- Institution pools

Seat assignments remain auditable.

---

# Device Management

Support:

- Registered devices
- Device replacement
- Device limits
- Device revocation
- Trusted devices

Policies remain configurable.

---

# Offline Licensing

Support:

- Signed offline licenses
- Periodic validation
- Grace periods
- Secure expiration
- Offline activation packages

Offline licenses must automatically expire without periodic validation.

---

# License Transfer

Support:

- Teacher transfer
- Student migration
- School migration
- Device transfer
- Seat reassignment

Transfer history is permanently retained.

---

# Compliance

Monitor:

- Excess seat usage
- Unauthorized sharing
- Expired licenses
- Duplicate activations
- Suspicious usage
- Institutional compliance

Compliance alerts integrate with the Audit Engine.

---

# APIs

Examples:

POST /api/v1/licenses

GET /api/v1/licenses/{id}

POST /api/v1/licenses/{id}/activate

POST /api/v1/licenses/{id}/validate

POST /api/v1/licenses/{id}/transfer

POST /api/v1/licenses/{id}/revoke

---

# Security

Enforce:

- Encryption
- Signed license tokens
- Tenant isolation
- Tamper detection
- Audit logging

License secrets are never exposed to clients.

---

# Audit Events

Generate events for:

- License created
- License issued
- Activation
- Validation
- Transfer
- Suspension
- Revocation
- Expiration
- Compliance violation

Audit records are immutable.

---

# Analytics

Track:

- Active licenses
- Activation rate
- Seat utilization
- Device usage
- Compliance violations
- Renewal rate
- Institutional adoption

---

# Performance

Support:

- Millions of licenses
- Real-time validation
- Horizontal scaling
- High availability
- Low-latency activation

---

# Acceptance Criteria

✓ License lifecycle

✓ Multiple license models

✓ Offline licensing

✓ Device management

✓ Seat management

✓ Compliance monitoring

✓ Analytics

✓ Complete audit logging

---

# Future Enhancements

- Hardware-backed licenses
- Blockchain-backed proof of ownership
- Dynamic educational licensing
- Cross-platform license federation
- AI-driven compliance analysis
- Geographic licensing policies

---

# Guiding Principle

The Licensing Engine ensures that every educational resource within SARTHI is accessed only by authorized users under transparent, flexible, and auditable licensing rules while supporting institutions of every size.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**
