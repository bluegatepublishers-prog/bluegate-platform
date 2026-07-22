# SARTHI Identity & Access Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Identity & Access Management (IAM)

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

This document defines the implementation details for the Identity and Access Management (IAM) subsystem of SARTHI.

It translates the Identity Architecture into engineering specifications, data models, APIs, workflows, security rules, and acceptance criteria.

---

# Scope

The IAM subsystem is responsible for:

- User identity
- Authentication
- Authorization
- Organization membership
- Role management
- Permissions
- Session management
- Multi-factor authentication
- Audit logging
- Account recovery

---

# Functional Components

The IAM service consists of:

1. Universal Identity Service
2. Authentication Service
3. Authorization Service
4. Organization Membership Service
5. Session Service
6. Device Management
7. MFA Service
8. Account Recovery
9. Audit Service
10. Identity API

---

# Universal Identity (SUID)

Every person receives exactly one SARTHI Universal ID.

Properties:

- Globally unique
- Never reused
- Never reassigned
- Permanent
- Independent of organizations

The SUID remains constant throughout the user's lifetime.

---

# Organization Membership

A user may belong to multiple organizations.

Examples:

- Bluegate Publishers
- ABC Public School
- XYZ Coaching
- National University

Each membership includes:

- Organization
- Role
- Status
- Join Date
- Leave Date
- Permissions

---

# Role Model

Support:

- Platform Roles
- Organization Roles
- Temporary Roles
- Delegated Roles

Permissions are evaluated from all active roles.

---

# Permission Resolution

Access is determined by:

User

↓

Active Membership

↓

Role

↓

Permission

↓

Tenant Scope

↓

Feature Flag

↓

Resource Ownership

↓

Final Decision

Permission checks must occur on every protected request.

---

# Authentication

Support:

- Email/password
- Passwordless (future)
- OAuth
- SSO
- MFA
- Session refresh

---

# Session Management

Track:

- Active sessions
- Device
- Browser
- IP
- Login time
- Last activity

Users may revoke individual sessions.

---

# Multi-Factor Authentication

Support:

- Authenticator Apps
- Email OTP
- SMS OTP
- Passkeys (future)
- Hardware Keys (future)

---

# Password Policy

Support configurable rules:

- Minimum length
- Complexity
- History
- Expiration (optional)
- Lockout policy

---

# Account Recovery

Recovery supports:

- Email verification
- MFA validation
- Recovery codes
- Administrator recovery (optional)

---

# API Endpoints

Authentication

POST /api/v1/auth/login

POST /api/v1/auth/logout

POST /api/v1/auth/refresh

POST /api/v1/auth/register

Identity

GET /api/v1/me

PATCH /api/v1/me

Organizations

GET /api/v1/me/organizations

Roles

GET /api/v1/me/roles

Permissions

GET /api/v1/me/permissions

Sessions

GET /api/v1/me/sessions

DELETE /api/v1/me/sessions/{id}

---

# Security

Enforce:

- HTTPS
- Secure cookies
- CSRF protection
- Rate limiting
- Session rotation
- Token validation
- Audit logging

---

# Audit Events

Generate events for:

- Login
- Logout
- Failed login
- Password change
- MFA enrollment
- Membership changes
- Role changes
- Permission changes
- Session revocation

---

# Acceptance Criteria

✓ One permanent SUID per person

✓ Multiple organization memberships supported

✓ Multiple concurrent roles supported

✓ Cross-tenant isolation enforced

✓ MFA supported

✓ Sessions independently revocable

✓ Complete audit logging

✓ All APIs documented

---

# Future Enhancements

- Decentralized identity
- Government identity integration
- APAAR integration
- Digital credentials
- Biometric authentication
- Passkey-first login

---

# Guiding Principle

Identity is the foundation of SARTHI.

Every service depends on secure, permanent, and trustworthy identity management.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**