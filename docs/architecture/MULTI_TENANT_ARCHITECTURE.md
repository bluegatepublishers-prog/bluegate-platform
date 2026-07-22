# SARTHI Multi-Tenant Architecture

**Version:** 1.0

**Status:** Draft

**Product:** SARTHI

**Related Documents:**
- SARTHI Constitution
- Master PRD
- Identity Architecture
- System Architecture
- Database Blueprint

---

# Purpose

This document defines the multi-tenant architecture of SARTHI.

The objective is to enable multiple independent organizations to securely use the same platform while ensuring complete data isolation, configurable branding, feature flexibility, and scalable operations.

---

# Vision

SARTHI is designed as a single Education Operating System serving multiple independent organizations.

Examples include:

- Educational Publishers
- Schools
- Coaching Institutes
- Colleges
- Universities
- Corporate Learning Organizations
- NGOs
- Government Educational Bodies

Each organization operates independently while sharing the same core platform.

---

# Core Principles

The multi-tenant architecture follows these principles:

- Shared Platform
- Isolated Data
- Configurable Experience
- Independent Administration
- Secure by Default
- Scalable by Design
- Feature Controlled
- Audit Enabled

---

# What is a Tenant?

A tenant is an independent organization using SARTHI.

Examples:

- Bluegate Publishers
- ABC Public School
- XYZ Coaching Institute
- National University
- Skill Academy

Each tenant has its own identity and configuration.

---

# Tenant Types

Supported tenant categories include:

- Publisher
- School
- Coaching Institute
- College
- University
- Corporate
- NGO
- Government Organization

Future tenant types can be added without redesigning the platform.

---

# Tenant Identity

Every tenant receives a permanent Tenant ID.

A tenant includes:

- Name
- Type
- Branding
- Contact Information
- Subscription
- Feature Configuration
- Administrators
- Status

Tenant IDs are immutable.

---

# Tenant Isolation

Every tenant owns its own operational data.

Examples include:

- Users
- Books
- Resources
- Classes
- Assessments
- Reports
- Branding
- Settings

Data belonging to one tenant must never be visible to another tenant unless explicitly authorized.

---

# Shared Platform Services

All tenants share the same core platform services:

- Identity
- Authentication
- Authorization
- Notifications
- Audit Logging
- AI Services
- Billing
- Search
- Analytics
- Storage
- Monitoring

These services remain centrally managed.

---

# Tenant Branding

Each tenant may configure:

- Logo
- Colors
- Theme
- Domain
- Email Templates
- Notification Templates
- Certificates
- Documents
- Landing Pages

Branding must not affect other tenants.

---

# Feature Management

Not every tenant requires every feature.

Feature availability may depend on:

- Subscription
- Tenant Type
- Licensing
- Regional Availability
- Beta Programs

Examples:

Publisher:

- Book Management
- Resource Publishing
- Sales Analytics

School:

- Attendance
- Timetable
- Parent Portal

Coaching Institute:

- Batch Management
- Test Series
- Rankings

---

# Tenant Administrators

Each tenant manages its own administrators.

Responsibilities include:

- User Management
- Role Assignment
- Settings
- Branding
- Reports
- Content Approval

Tenant administrators cannot access platform-wide administration.

---

# Platform Administration

Platform administrators manage:

- Infrastructure
- Platform Security
- Billing
- Global Settings
- Compliance
- Support
- Tenant Provisioning

Platform administrators do not modify tenant data except through authorized support processes.

---

# User Membership

One person may belong to multiple tenants.

Examples:

Teacher:

- School A
- Coaching Institute B

Author:

- Publisher X
- Publisher Y

Parent:

- School A
- School B

Each membership includes its own permissions and responsibilities.

---

# Subscription Model

Each tenant may subscribe independently.

Possible plans:

- Free
- Starter
- Professional
- Enterprise
- Government

Subscriptions determine available platform capabilities.

---

# Resource Ownership

Resources belong to their owners.

Possible owners:

- Publisher
- School
- Teacher
- Institution
- Marketplace Seller

Ownership remains explicit.

---

# Marketplace Access

Marketplace permissions may include:

- Private
- Tenant Only
- Publisher Network
- Public Marketplace

Visibility is configurable for every resource.

---

# Tenant Lifecycle

Every tenant progresses through a lifecycle.

Prospect

↓

Trial

↓

Active

↓

Suspended

↓

Archived

↓

Closed

Lifecycle events should be fully audited.

---

# Data Migration

The platform should support:

- Tenant Import
- Tenant Export
- Tenant Backup
- Tenant Restore

Migration should preserve identity and historical records.

---

# Security

Tenant security includes:

- Data Isolation
- Role-Based Access Control
- Audit Logs
- Encryption
- Secure APIs
- Session Protection
- Rate Limiting

Cross-tenant access must always be authorized and auditable.

---

# AI Isolation

AI services should respect tenant boundaries.

AI-generated content should never expose another tenant's:

- Books
- Resources
- Assessments
- Users
- Reports
- Internal Data

Unless explicitly shared through supported collaboration features.

---

# Reporting

Each tenant has access only to its own reports.

Examples:

- Student Performance
- Teacher Productivity
- Resource Usage
- Revenue
- Marketplace Activity

Platform-wide reporting is restricted to authorized platform administrators.

---

# Future Expansion

The architecture should support:

- White-label deployments
- Regional hosting
- International education systems
- Franchise networks
- Multi-campus institutions
- Plugin ecosystem
- Enterprise integrations

---

# Guiding Principle

One platform.

Many organizations.

Complete isolation.

Shared innovation.

Every tenant should experience SARTHI as if it were built specifically for them, while benefiting from the reliability, scalability, and continuous improvement of a shared Education Operating System.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**