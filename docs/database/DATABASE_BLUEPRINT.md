# SARTHI Database Blueprint

**Version:** 1.0

**Status:** Draft

**Product:** SARTHI

**Related Documents:**
- SARTHI Constitution
- Master PRD
- Identity Architecture
- System Architecture

---

# Purpose

This document defines the long-term database design principles, data domains, ownership rules, lifecycle management, and modeling standards for the SARTHI Education Operating System.

It is a conceptual blueprint rather than a database schema.

---

# Database Philosophy

The database exists to preserve educational continuity, data integrity, and institutional trust.

Every design decision should prioritize:

- Data correctness
- Scalability
- Security
- Auditability
- Performance
- Simplicity
- Long-term maintainability

---

# Core Data Domains

The platform is divided into major data domains.

## Identity

Stores:

- Individuals
- Organizations
- Roles
- Memberships
- Permissions
- Authentication
- Verification

---

## Learning

Stores:

- Programs
- Courses
- Subjects
- Books
- Chapters
- Modules
- Learning Objects

---

## Academic

Stores:

- Classes
- Sections
- Timetables
- Attendance
- Homework
- Assessments
- Grades

---

## Resources

Stores:

- PDFs
- Videos
- Images
- Worksheets
- Lesson Plans
- Presentations
- Interactive Content

---

## Marketplace

Stores:

- Products
- Licenses
- Pricing
- Orders
- Purchases
- Reviews

---

## AI

Stores:

- AI Requests
- AI Responses
- Usage
- Prompts
- Templates
- Feedback

---

## Analytics

Stores:

- Learning Events
- Competencies
- Progress
- Scores
- Dashboards

---

## Administration

Stores:

- Settings
- Branding
- Audit Logs
- Feature Flags
- Notifications

---

# Entity Standards

Every entity should follow consistent conventions.

Recommended common fields:

- ID
- Created At
- Updated At
- Created By
- Updated By
- Status
- Version

Where appropriate:

- Published At
- Archived At
- Deleted At

---

# Primary Keys

Every entity shall use stable immutable identifiers.

Identifiers should never be reused.

Primary keys should not encode business meaning.

---

# Relationships

Relationships should be explicit.

Examples:

Student → Class

Teacher → School

Book → Chapter

Chapter → Module

Module → Learning Object

Publisher → Book

School → Student

---

# Soft Delete

Critical educational records should not be permanently deleted during normal operation.

Preferred lifecycle:

Active

↓

Archived

↓

Soft Deleted

↓

Permanent Removal (administrative process only)

---

# Versioning

Educational content should support version history.

Examples:

- Books
- Lesson Plans
- Worksheets
- Assessments
- Policies

Previous versions should remain recoverable where appropriate.

---

# Multi-Tenant Rules

Every tenant owns:

- Users
- Books
- Resources
- Reports
- Branding
- Settings

Cross-tenant access must be explicitly authorized.

---

# Audit Requirements

Important actions should be recorded.

Examples:

- Login
- Logout
- Password Change
- User Creation
- Book Publication
- Resource Upload
- Assessment Submission
- Administrative Changes

Audit records should be append-only.

---

# Data Integrity

The database should enforce:

- Foreign Keys
- Unique Constraints
- Check Constraints
- Referential Integrity

Business rules should be enforced in both application logic and database constraints where appropriate.

---

# Search Strategy

Searchable entities include:

- Books
- Resources
- Teachers
- Students
- Institutions
- Courses
- Marketplace Products

Search should support:

- Full-text search
- Filtering
- Sorting
- Faceted navigation

---

# File Storage

Large files should not be stored directly in the relational database.

Examples:

- PDFs
- Videos
- Images
- Audio
- Presentations

The database stores metadata and references to secure object storage.

---

# Data Lifecycle

Every record progresses through a lifecycle.

Example:

Draft

↓

Review

↓

Published

↓

Archived

↓

Retired

Lifecycle stages vary by entity type.

---

# Backup Strategy

The platform should support:

- Automated backups
- Point-in-time recovery
- Versioned backups
- Disaster recovery testing
- Backup verification

---

# Performance Principles

Database design should minimize:

- Duplicate data
- Large joins
- Expensive queries
- Blocking operations

Indexes should support common access patterns.

---

# Scalability

The data model should support:

- Millions of users
- Thousands of organizations
- Billions of learning events
- Large digital libraries

Partitioning and sharding strategies may be introduced as scale requires.

---

# Privacy

Personal information should be classified by sensitivity.

Examples:

Public

Internal

Confidential

Sensitive

Access should follow least-privilege principles.

---

# Data Retention

Different data categories may have different retention policies.

Examples:

- Audit Logs
- AI Requests
- Notifications
- Sessions
- Assessments
- Financial Records

Retention policies should comply with applicable legal and contractual requirements.

---

# Future Expansion

The database architecture should support future capabilities including:

- Digital Credentials
- Skills Passport
- International Curricula
- Research Data
- Plugin Metadata
- AI Memory
- Learning Graphs

New capabilities should extend the model rather than requiring redesign.

---

# Guiding Principle

The database is the long-term memory of SARTHI.

It must preserve educational history, protect user trust, support institutional growth, and remain adaptable for future innovation.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**