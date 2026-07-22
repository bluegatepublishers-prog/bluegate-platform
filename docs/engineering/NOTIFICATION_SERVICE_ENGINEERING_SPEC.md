# SARTHI Notification Service Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Notification Service

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Notification Service provides a centralized communication engine responsible for delivering alerts, reminders, confirmations, announcements, and workflow events across the SARTHI platform.

Applications publish notification events rather than communicating directly with delivery providers.

---

# Scope

The Notification Service is responsible for:

- Notification creation
- Template management
- Multi-channel delivery
- Scheduling
- User preferences
- Delivery tracking
- Retry management
- Notification analytics
- Audit logging
- Provider abstraction

---

# Supported Channels

The platform supports:

- In-App Notifications
- Email
- SMS
- Push Notifications
- WhatsApp
- Voice Calls (future)
- Microsoft Teams (future)
- Slack (future)
- Webhooks

New delivery channels should be pluggable.

---

# Notification Lifecycle

Event Generated

↓

Template Selection

↓

Personalization

↓

Policy Validation

↓

Queue

↓

Delivery

↓

Confirmation

↓

Retry (if required)

↓

Archive

---

# Notification Architecture

```
Application

↓

Notification API

↓

Notification Service

↓

Template Engine

↓

Preference Engine

↓

Queue

↓

Channel Providers

↓

Delivery

↓

Analytics
```

---

# Event Sources

Notifications may originate from:

- Authentication
- Identity
- Teacher Platform
- Student Platform
- Parent Platform
- Publisher Platform
- School ERP
- Coaching ERP
- University Platform
- Marketplace
- Assessment Engine
- Resource Management
- AI Services
- Billing
- Monitoring

---

# Notification Types

Support:

- Information
- Reminder
- Warning
- Success
- Error
- Emergency
- Promotional
- System

Priority should be configurable.

---

# User Preferences

Users may configure:

- Enabled channels
- Quiet hours
- Language
- Frequency
- Digest mode
- Emergency overrides

Institutional policies may override personal preferences where legally required.

---

# Templates

Templates support:

- Versioning
- Localization
- Variables
- Branding
- Preview
- Approval workflow

Templates are reusable.

---

# Variables

Example variables:

- User Name
- Institution Name
- Class
- Assignment
- Assessment
- Date
- Time
- Links
- QR Codes

Variables are validated before delivery.

---

# Scheduling

Support:

- Immediate delivery
- Delayed delivery
- Recurring notifications
- Calendar-based delivery
- Time-zone aware delivery

---

# Queue Management

The queue supports:

- Priority queues
- Delayed queues
- Retry queues
- Dead-letter queues

Delivery should be asynchronous.

---

# Delivery Providers

Provider abstraction supports:

- SMTP
- SMS gateways
- Firebase
- Apple Push Notification Service
- WhatsApp Business API
- Future providers

Applications never call providers directly.

---

# Retry Policy

Retry strategy includes:

- Exponential backoff
- Maximum retry count
- Failure classification
- Dead-letter handling

Permanent failures are logged.

---

# Notification Center

Users can:

- View notifications
- Mark as read
- Archive
- Search
- Filter
- Delete personal notifications

System notifications remain auditable.

---

# Analytics

Track:

- Delivery rate
- Open rate
- Click-through rate
- Bounce rate
- Failure rate
- Channel usage
- Notification latency

---

# Security

The service enforces:

- Tenant isolation
- Permission validation
- Secure template rendering
- Rate limiting
- Audit logging

---

# Audit Events

Generate audit events for:

- Template creation
- Template approval
- Notification sent
- Delivery failure
- Preference updates
- Channel configuration changes

---

# APIs

Examples:

POST /api/v1/notifications

GET /api/v1/notifications

PATCH /api/v1/notifications/{id}/read

GET /api/v1/templates

POST /api/v1/templates

GET /api/v1/preferences

PATCH /api/v1/preferences

---

# Performance

Support:

- Millions of notifications per day
- Horizontal scaling
- Batch processing
- High availability
- Low delivery latency

---

# Acceptance Criteria

✓ Multi-channel delivery

✓ Queue-based architecture

✓ Template versioning

✓ User preferences respected

✓ Delivery retries

✓ Provider abstraction

✓ Complete audit logging

✓ API documentation complete

---

# Future Enhancements

- AI notification prioritization
- Smart delivery timing
- Multi-language voice notifications
- Rich interactive notifications
- Cross-device synchronization
- Intelligent digest generation

---

# Guiding Principle

Every notification should be timely, relevant, secure, personalized, and delivered through the user's preferred communication channel while respecting institutional policies and privacy.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**