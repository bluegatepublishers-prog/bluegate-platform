# SARTHI Identity Architecture

**Version:** 1.0

**Status:** Draft

**Product:** SARTHI

**Related Documents:**
- SARTHI Constitution
- Master PRD

---

# Purpose

The Identity Architecture defines how people, organizations, roles, and trust are represented within SARTHI.

Identity is the foundation of the platform.

Every learner, educator, institution, publisher, and administrator interacts with SARTHI through a secure identity.

---

# Objectives

The identity system shall:

- Provide one lifelong identity for every individual.
- Support multiple organizations.
- Support multiple roles.
- Prevent duplicate accounts where reasonably possible.
- Preserve educational history.
- Enable secure authentication.
- Support authorization.
- Support future integrations.

---

# Core Principles

The identity system follows these principles:

- One Person → One Identity
- Multiple Roles
- Multiple Organizations
- Progressive Trust
- Privacy by Design
- Secure by Default

---

# Identity Types

SARTHI supports two major identity categories.

## Individual

Examples:

- Student
- Teacher
- Parent
- Principal
- Author
- Mentor
- Reviewer
- Publisher Employee

Every individual receives one SARTHI Universal ID (SUID).

---

## Organization

Examples:

- School
- Publisher
- Coaching Institute
- University
- College
- NGO
- Corporate Learning Organization

Every organization receives a unique Organization ID.

---

# SARTHI Universal ID (SUID)

The SUID is permanent.

Properties:

- Never reused
- Never reassigned
- Never changes
- Independent of institutions
- Independent of employers
- Independent of publishers

Example:

```
SUID-000000000001
```

The format may evolve without changing the principle of permanence.

---

# Organization ID

Each organization receives a permanent Organization ID.

Examples:

- School
- Publisher
- Coaching Institute
- University

Organizations own operational data but do not own personal identities.

---

# Roles

One individual may hold multiple roles.

Examples:

- Student
- Parent
- Teacher
- Author
- Publisher Admin
- School Admin
- Principal
- Reviewer
- Marketplace Seller

Roles are assigned independently of identity.

---

# Role Lifecycle

A person's roles may change over time.

Example:

Student

↓

Teacher

↓

Principal

↓

Author

↓

Publisher Consultant

↓

Mentor

The SUID remains unchanged.

---

# Identity Verification

Verification is separate from identity.

Verification levels may include:

- Email Verified
- Mobile Verified
- Parent Verified
- Institution Verified
- Qualification Verified
- Government-linked Identifier Verified
- Manual Verification

Verification may increase over time.

---

# Authentication

Supported authentication methods include:

- Email and Password
- Mobile OTP
- Social Login
- Enterprise SSO
- Multi-Factor Authentication
- Passwordless Authentication (future)

Authentication proves access.

Identity represents the person.

---

# Authorization

Authorization determines what an authenticated user can access.

Authorization is based on:

- Role
- Organization
- Permissions
- Subscription
- Feature Access
- Tenant Policies

---

# Organization Membership

A person may belong to multiple organizations.

Examples:

Teacher

- School A
- Coaching B

Author

- Publisher X
- Publisher Y

Parent

- School A
- School B

Membership history should be preserved.

---

# Identity Relationships

Supported relationships include:

- Parent → Student
- Teacher → Student
- Teacher → Class
- School → Teacher
- Publisher → Author
- Publisher → Book
- Institution → Student

Relationships are independent of identity.

---

# Duplicate Detection

Potential duplicates may be identified using combinations of:

- Name
- Date of Birth
- Mobile Number
- Email
- Parent Information
- Institution
- Government-linked Identifiers

Potential duplicates should be reviewed before merging.

---

# Identity Merge Policy

Identity merges should be:

- Controlled
- Audited
- Reversible where practical
- Restricted to authorized administrators

---

# Identity History

SARTHI should maintain:

- Role history
- Organization history
- Verification history
- Login history
- Security events
- Audit records

Historical records must remain immutable where appropriate.

---

# Privacy

Users control their personal information.

The platform shall:

- Minimize unnecessary data collection.
- Protect sensitive information.
- Support consent where required.
- Respect applicable privacy regulations.

---

# Future Integrations

Identity architecture should support future integration with:

- APAAR
- Academic Bank of Credits
- University Systems
- Government Platforms
- HR Systems
- Publisher Systems

External identifiers complement but do not replace the SARTHI Universal ID.

---

# Guiding Principle

Identity belongs to the individual.

Organizations manage relationships.

Roles define responsibilities.

Permissions define access.

Verification builds trust.

The SARTHI Universal ID remains the lifelong foundation of the platform.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**