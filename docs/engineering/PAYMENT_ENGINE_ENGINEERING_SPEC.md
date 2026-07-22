# SARTHI Payment Engine Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Payment Engine

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Payment Engine provides a centralized payment infrastructure for the SARTHI platform.

It processes payments, refunds, settlements, subscriptions, invoices, taxes, reconciliation, and payment-provider integrations while remaining provider-neutral.

Applications never communicate directly with payment gateways.

---

# Scope

The Payment Engine is responsible for:

- Payment authorization
- Payment capture
- Refunds
- Settlement
- Invoice generation
- Payment reconciliation
- Payment provider abstraction
- Tax integration
- Payment analytics
- Audit logging

---

# Design Principles

The Payment Engine shall be:

- Provider Neutral
- PCI Conscious
- Secure
- Auditable
- Fault Tolerant
- Idempotent
- Event Driven
- Highly Available

---

# Architecture

```
Applications

↓

Payment API

↓

Payment Engine

├── Payment Manager
├── Authorization Service
├── Capture Service
├── Refund Service
├── Settlement Service
├── Reconciliation Engine
├── Invoice Generator
├── Tax Adapter
├── Provider Adapter
├── Analytics
└── Audit Logger

↓

Payment Providers
```

---

# Supported Transactions

Support:

- One-time payment
- Subscription payment
- Partial payment
- Installment payment
- Refund
- Partial refund
- Credit adjustment
- Wallet payment (future)

---

# Payment Lifecycle

Created

↓

Authorized

↓

Captured

↓

Completed

↓

Settled

↓

Archived

Alternative paths:

- Failed
- Cancelled
- Refunded
- Partially Refunded
- Disputed

---

# Provider Abstraction

Support:

- Razorpay
- Stripe
- PayPal
- Cashfree
- PhonePe
- UPI
- Bank Transfer
- Future providers

Applications remain provider-independent.

---

# Authorization

Validate:

- Customer identity
- Order reference
- Currency
- Amount
- Merchant configuration
- Fraud checks
- Idempotency key

---

# Capture

Support:

- Immediate capture
- Manual capture
- Partial capture
- Delayed capture

Capture policies are configurable.

---

# Refunds

Support:

- Full refund
- Partial refund
- Automatic refund
- Manual refund

Refunds remain linked to the original payment.

---

# Settlement

Track:

- Gross amount
- Fees
- Taxes
- Net amount
- Settlement date
- Settlement status

Settlement reports are versioned.

---

# Reconciliation

Automatically reconcile:

- Gateway records
- Internal transactions
- Settlement reports
- Refunds
- Chargebacks

Exceptions generate alerts.

---

# Invoice Generation

Generate:

- Tax invoice
- Credit note
- Refund receipt
- Payment receipt

Invoices support localization and tenant branding.

---

# Taxes

Support:

- GST
- VAT
- Sales Tax
- Reverse Charge
- Tax exemptions

Tax calculation integrates with the Commerce Engine.

---

# Fraud Prevention

Support:

- Velocity checks
- Duplicate payment detection
- Risk scoring
- Device validation
- Geographic anomaly detection

Fraud rules are configurable.

---

# Idempotency

Every payment request includes an idempotency key.

Duplicate requests must never create duplicate financial transactions.

---

# APIs

Examples:

POST /api/v1/payments

GET /api/v1/payments/{id}

POST /api/v1/payments/{id}/capture

POST /api/v1/payments/{id}/refund

GET /api/v1/payments/{id}/invoice

POST /api/v1/payments/webhook

---

# Webhooks

Support provider webhooks for:

- Authorization
- Capture
- Refund
- Settlement
- Chargeback
- Payment failure

Webhook signatures must be validated.

---

# Security

Enforce:

- HTTPS
- Encryption
- Signed webhooks
- Tokenized payment references
- Tenant isolation
- Audit logging

Sensitive payment credentials are never stored in application databases.

---

# Audit Events

Generate events for:

- Payment created
- Authorization
- Capture
- Refund
- Settlement
- Reconciliation
- Invoice generation
- Chargeback

Audit records are immutable.

---

# Analytics

Track:

- Revenue
- Payment success rate
- Gateway latency
- Refund rate
- Chargeback rate
- Settlement delays
- Provider performance

---

# Performance

Support:

- High transaction throughput
- Horizontal scaling
- Retry handling
- High availability
- Disaster recovery

---

# Acceptance Criteria

✓ Provider abstraction

✓ Authorization & capture

✓ Refund support

✓ Settlement tracking

✓ Reconciliation

✓ Invoice generation

✓ Fraud detection hooks

✓ Complete audit logging

---

# Future Enhancements

- Multi-currency payments
- Wallet integration
- Split payments
- Escrow support
- Buy Now Pay Later (BNPL)
- Cryptocurrency support (where legally permitted)
- AI-powered fraud detection

---

# Guiding Principle

Every financial transaction within SARTHI should be secure, traceable, auditable, provider-independent, and resilient, ensuring financial integrity while supporting institutions, publishers, creators, and learners.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**