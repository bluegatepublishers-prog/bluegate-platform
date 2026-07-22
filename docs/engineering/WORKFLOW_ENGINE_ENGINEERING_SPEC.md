# SARTHI Workflow Engine Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Workflow Engine

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Workflow Engine provides a configurable platform for orchestrating business processes, approvals, state transitions, escalations, and automation across the SARTHI ecosystem.

Applications define workflows rather than embedding process logic directly into application code.

---

# Scope

The Workflow Engine is responsible for:

- Workflow definitions
- State management
- Approvals
- Conditional routing
- Automation
- Timers
- Escalations
- Notifications
- Audit logging
- Workflow analytics

---

# Design Principles

The Workflow Engine shall be:

- Configurable
- Reusable
- Event-driven
- Auditable
- Tenant-aware
- Role-aware
- Human-centric
- Extensible

---

# Supported Workflow Types

Examples include:

- Teacher Verification
- School Registration
- Publisher Onboarding
- Book Publication
- Resource Publication
- Inspection Copy Approval
- Student Admission
- Leave Approval
- Purchase Approval
- Subscription Upgrade
- AI Content Review
- Certificate Issuance

New workflows should be configurable without modifying engine code.

---

# Workflow Architecture

```
Applications

↓

Workflow API

↓

Workflow Engine

├── Definition Service

├── State Machine

├── Rules Engine

├── Assignment Engine

├── Timer Engine

├── Escalation Engine

├── Notification Hooks

├── Audit Service

└── Analytics

↓

Workflow Store
```

---

# Workflow Definition

Each workflow defines:

- Identifier
- Name
- Description
- Version
- Tenant Scope
- Trigger
- States
- Transitions
- Rules
- Participants

Definitions are versioned and immutable once published.

---

# State Model

Every workflow consists of states.

Example:

Draft

↓

Submitted

↓

Under Review

↓

Approved

↓

Published

↓

Archived

Transitions occur only through defined rules.

---

# State Types

Support:

- Initial
- Intermediate
- Waiting
- Approval
- Rejection
- Completed
- Cancelled
- Archived

---

# Transition Rules

Transitions may depend on:

- User role
- Permissions
- Time
- Conditions
- External events
- Data validation
- Previous approvals

Invalid transitions are rejected.

---

# Assignment Engine

Tasks may be assigned to:

- Individual users
- Roles
- Departments
- Teams
- Groups
- Dynamic rules

Assignments support reassignment where permitted.

---

# Approval Model

Support:

- Single approver
- Multiple approvers
- Sequential approval
- Parallel approval
- Majority approval
- Unanimous approval
- Delegated approval

Approval policies are configurable.

---

# Rules Engine

Rules support:

- Conditions
- Expressions
- Field comparisons
- Time conditions
- Organization policies
- Subscription limits
- Feature flags

Rules execute before transitions.

---

# Timers

Support:

- Due dates
- SLA timers
- Waiting periods
- Scheduled actions
- Escalation timers

Timers are time-zone aware.

---

# Escalations

Escalate when:

- Approval overdue
- Task overdue
- SLA breach
- High-priority requests
- Critical incidents

Escalations may notify alternate approvers.

---

# Notifications

Workflow events integrate with the Notification Service.

Examples:

- Task assigned
- Reminder
- Approval granted
- Rejection
- Escalation
- Completion

The Workflow Engine does not deliver notifications directly.

---

# Events

Generate events for:

- Workflow started
- State changed
- Task assigned
- Approval completed
- Escalation triggered
- Workflow completed
- Workflow cancelled

Events integrate with the Event Bus.

---

# Workflow History

Record:

- Every state
- Every transition
- Actor
- Timestamp
- Decision
- Comments
- Attachments

History is immutable.

---

# APIs

Examples:

POST /api/v1/workflows/start

GET /api/v1/workflows/{id}

PATCH /api/v1/workflows/{id}/transition

GET /api/v1/tasks

PATCH /api/v1/tasks/{id}/complete

---

# Security

Enforce:

- Tenant isolation
- Permission validation
- Role validation
- Workflow ownership
- Audit logging

---

# Audit Events

Generate events for:

- Workflow creation
- Definition publication
- Workflow start
- Transition
- Approval
- Rejection
- Escalation
- Cancellation

---

# Analytics

Track:

- Active workflows
- Completion rate
- Average processing time
- SLA compliance
- Bottlenecks
- Escalation frequency
- Approval turnaround

---

# Performance

Support:

- Millions of workflow instances
- Parallel execution
- Horizontal scaling
- Asynchronous processing
- High availability

---

# Acceptance Criteria

✓ Configurable workflows

✓ State machine enforcement

✓ Multi-level approvals

✓ Rules engine

✓ Timer support

✓ Escalations

✓ Notification integration

✓ Complete audit history

---

# Future Enhancements

- Visual workflow designer
- BPMN 2.0 import/export
- AI workflow optimization
- Predictive bottleneck detection
- Cross-tenant workflow templates
- Human + AI collaborative approvals

---

# Guiding Principle

Business processes should be modeled, versioned, and executed by a centralized workflow engine so that every approval, transition, and automation within SARTHI is consistent, transparent, auditable, and adaptable without requiring application code changes.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**