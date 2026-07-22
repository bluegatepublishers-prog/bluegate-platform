# SARTHI System Architecture

**Version:** 1.0

**Status:** Draft

**Product:** SARTHI

**Related Documents:**
- SARTHI Constitution
- Master PRD
- Identity Architecture

---

# Purpose

This document defines the high-level technical architecture of the SARTHI Education Operating System.

It explains how the platform is structured, how major modules interact, and the architectural principles that guide future development.

---

# Architectural Vision

SARTHI is a cloud-native, modular, multi-tenant Education Operating System (Education OS).

The platform is designed to support millions of users while allowing independent development and evolution of individual modules.

Every module should integrate through shared platform services rather than direct dependencies wherever practical.

---

# Architectural Principles

The architecture shall follow these principles:

- Modular by Design
- Multi-Tenant by Default
- Secure by Default
- API-First
- Cloud Native
- AI Ready
- Event Friendly
- Scalable
- Observable
- Backward Compatible where practical

---

# High-Level Architecture

```
                        +----------------------+
                        |   Web Applications   |
                        +----------+-----------+
                                   |
        +--------------------------+--------------------------+
        |                          |                          |
+---------------+         +----------------+         +----------------+
| Mobile Apps   |         | Admin Portal   |         | Public Website |
+---------------+         +----------------+         +----------------+
                \              |               /
                 \             |              /
                  +------------+-------------+
                               |
                    API Gateway / Backend
                               |
+------------------------------------------------------------------+
|                     Shared Platform Services                      |
|------------------------------------------------------------------|
| Identity | Auth | Permissions | Notifications | Search | Audit   |
| Storage | Billing | AI | Analytics | Settings | Logging          |
+------------------------------------------------------------------+
                               |
+------------------------------------------------------------------+
|                      Business Modules                            |
|------------------------------------------------------------------|
| Learning | Teacher | Student | Parent | School | Publisher       |
| Coaching | University | Marketplace | Assessment | Resources      |
+------------------------------------------------------------------+
                               |
+------------------------------------------------------------------+
|                        Data Layer                                |
|------------------------------------------------------------------|
| PostgreSQL | Object Storage | Cache | Search Index | Backups      |
+------------------------------------------------------------------+
```

---

# Platform Layers

## Presentation Layer

Responsible for user interaction.

Includes:

- Public Website
- Student Portal
- Teacher Portal
- Parent Portal
- School Dashboard
- Publisher Dashboard
- Admin Dashboard
- Mobile Applications

Presentation should contain minimal business logic.

---

## Application Layer

Responsible for business workflows.

Examples:

- User registration
- Book publishing
- Resource management
- Assessment generation
- Learning progress
- Marketplace transactions

Business rules belong here.

---

## Shared Platform Services

Every module should use shared services rather than implementing duplicate functionality.

Core services include:

- Identity
- Authentication
- Authorization
- Notifications
- Audit Logging
- File Storage
- Search
- AI Services
- Billing
- Analytics
- Configuration
- Feature Flags

---

## Business Modules

Major functional modules include:

### Identity Platform

Manages users, organizations, roles, permissions, and authentication.

---

### Learning Platform

Manages:

- Courses
- Subjects
- Books
- Chapters
- Modules
- Learning Objects

---

### Teacher Platform

Provides:

- Lesson Planning
- Worksheets
- Question Papers
- AI Teaching Assistant
- Resource Library
- Classroom Management

---

### Student Platform

Provides:

- Learning Dashboard
- Assignments
- Practice
- Assessments
- AI Tutor
- Progress Tracking

---

### Parent Platform

Provides:

- Progress Monitoring
- Attendance
- Communication
- Notifications
- Reports

---

### School Platform

Provides:

- School Administration
- Staff Management
- Timetable
- Attendance
- Fee Management
- Reports

---

### Publisher Platform

Provides:

- Book Management
- Resource Publishing
- Author Management
- Distribution
- Inspection Copies
- Analytics

---

### Coaching Platform

Provides:

- Batch Management
- Competitive Exams
- Live Classes
- Test Series
- Rankings

---

### University Platform

Provides:

- Departments
- Faculty
- Courses
- Credits
- Academic Records

---

### Marketplace Platform

Supports:

- Digital Resources
- Books
- Courses
- Lesson Plans
- Worksheets
- Subscriptions

---

### AI Platform

Shared AI services including:

- AI Teacher
- AI Student
- AI Author
- AI Analytics
- AI Content Generation
- AI Recommendations

---

# Data Architecture

The platform stores data in specialized systems.

Primary Database

- PostgreSQL

Object Storage

- PDFs
- Videos
- Images
- Documents
- Assignments

Caching

- Frequently accessed data
- Sessions
- Rate limits

Search

- Books
- Resources
- Teachers
- Institutions

Backups

- Automated
- Versioned
- Tested regularly

---

# Security Architecture

Security applies across all layers.

Includes:

- Authentication
- Authorization
- Audit Logs
- Encryption
- Secure APIs
- Role-Based Access Control
- Multi-Factor Authentication (future)

---

# Multi-Tenant Design

Each tenant has isolated:

- Users
- Resources
- Data
- Branding
- Configuration
- Reports

No tenant should access another tenant's information without explicit authorization.

---

# Integration Layer

External integrations may include:

- Payment Gateways
- SMS Providers
- Email Providers
- WhatsApp
- Government Systems
- APAAR
- School ERP
- Publisher ERP
- AI Providers

All integrations should use secure APIs.

---

# Scalability Strategy

The platform should scale horizontally.

Design assumptions:

- Millions of users
- Thousands of organizations
- Large digital libraries
- High concurrent usage

Modules should scale independently where practical.

---

# Observability

Every service should support:

- Structured Logging
- Metrics
- Monitoring
- Health Checks
- Distributed Tracing
- Error Reporting
- Performance Analytics

---

# Technology Principles

Technology choices should prioritize:

- Reliability
- Maintainability
- Security
- Performance
- Developer Productivity
- Long-Term Support

Frameworks may evolve, but the architectural principles remain stable.

---

# Future Expansion

The architecture should support future additions without major redesign.

Potential future capabilities include:

- International curricula
- Multiple languages
- Offline learning
- Digital credentials
- Skills passport
- Virtual classrooms
- Adaptive learning
- AI agents
- Third-party extensions
- Plugin ecosystem

---

# Guiding Principle

Every new feature should:

- Reuse shared platform services.
- Respect tenant isolation.
- Preserve user privacy.
- Support scalability.
- Remain aligned with the SARTHI Constitution.

Architecture should evolve, but simplicity, security, and educational value should remain constant.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**
