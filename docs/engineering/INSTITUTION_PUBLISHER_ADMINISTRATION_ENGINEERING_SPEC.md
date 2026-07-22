# SARTHI Institution & Publisher Administration Engineering Specification

**Version:** 5.0

**Status:** Engineering Ready

**Module:** Institution & Publisher Administration

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Institution & Publisher Administration platform provides centralized administration for every organization operating within SARTHI.

It manages organizational identity, governance, multi-campus structures, publisher operations, institutional configuration, licensing, branding, user administration, operational policies, and organizational analytics.

The platform establishes the enterprise foundation for educational organizations participating in the SARTHI ecosystem.

---

# Scope

The platform is responsible for:

- Organization management
- Publisher management
- School group administration
- Institution hierarchy
- Multi-campus administration
- Organizational branding
- Policy management
- Organizational settings
- User administration
- License assignment
- Feature configuration
- Organization analytics

---

# Design Principles

The platform shall be:

- Multi-Tenant
- Organization Agnostic
- Highly Configurable
- Secure
- Extensible
- Policy Driven
- Enterprise Ready
- AI Ready

---

# Architecture

```
Organization

├── Organization Profile
├── Organizational Hierarchy
├── Publisher Management
├── Institution Management
├── Campus Management
├── User Administration
├── Role Administration
├── Branding
├── Licensing
├── Feature Management
├── Organizational Policies
├── Analytics
└── Audit
```

---

# Organization Types

Support:

- Educational Publisher
- School
- School Group
- University
- College
- Coaching Institute
- Vocational Institute
- NGO
- Government Agency
- Corporate Learning
- Independent Educator

Additional organization types may be defined without redesign.

---

# Organizational Hierarchy

Support:

Enterprise

↓

Organization

↓

Region

↓

Institution

↓

Campus

↓

Department

↓

Academic Unit

↓

Teams

Hierarchy depth is configurable.

---

# Publisher Administration

Publishers may manage:

- Book catalogs
- Digital resources
- Curriculum mapping
- Licensing
- Teacher resources
- AI content
- School partnerships
- Analytics

Publishers remain isolated from each other.

---

# Institution Administration

Institutions manage:

- Academic settings
- Academic calendars
- Classes
- Departments
- Teachers
- Students
- Parents
- Resources
- Policies

Institution settings override organization defaults where permitted.

---

# Branding

Support organization-specific:

- Logos
- Themes
- Colors
- Email templates
- Reports
- Certificates
- Portals
- Mobile branding

Branding inheritance is configurable.

---

# Organizational Policies

Manage:

- Attendance policies
- Assessment policies
- Promotion rules
- Leave policies
- AI policies
- Security policies
- Communication policies

Policies are version controlled.

---

# User Administration

Support:

- Invitations
- Account provisioning
- Bulk imports
- Bulk updates
- Deactivation
- Transfers
- Delegation

User lifecycle is audited.

---

# Feature Management

Organizations may enable:

- AI services
- Marketplace
- Parent portal
- Teacher portal
- Student portal
- Library
- Assessments
- Analytics
- Payments

Feature availability depends on licensing.

---

# Licensing

Support:

- Organization licenses
- Campus licenses
- Student licenses
- Teacher licenses
- Resource licenses
- AI usage plans

Licensing integrates with the Subscription Engine.

---

# Organizational Analytics

Provide:

- User growth
- Institution growth
- Resource usage
- AI adoption
- Academic trends
- Operational health
- License utilization

---

# AI Administration

Allow administrators to configure:

- Approved AI providers
- Usage limits
- Model availability
- Prompt governance
- Data retention
- Safety policies

AI configuration is organization specific.

---

# APIs

Examples:

GET /api/v1/organizations

POST /api/v1/organizations

GET /api/v1/publishers

POST /api/v1/licenses

GET /api/v1/features

GET /api/v1/branding

---

# Security

Enforce:

- Tenant isolation
- Enterprise RBAC
- Delegated administration
- Audit logging
- Organization boundary enforcement

Cross-tenant access is prohibited.

---

# Audit Events

Generate events for:

- Organization created
- Campus added
- Branding updated
- Policy changed
- License assigned
- Feature enabled
- Administrator appointed

Audit records are immutable.

---

# Analytics

Track:

- Organization growth
- Institution activity
- License utilization
- Feature adoption
- AI usage
- Administrative workload
- Platform health

---

# Performance

Support:

- Millions of users
- Thousands of organizations
- Large enterprise hierarchies
- Horizontal scaling
- High availability

---

# Acceptance Criteria

✓ Organization hierarchy

✓ Publisher administration

✓ Institution administration

✓ Branding

✓ Licensing

✓ Feature management

✓ Organizational analytics

✓ Complete audit logging

---

# Future Enhancements

- Multi-country organization management
- Franchise administration
- Federation between organizations
- AI governance dashboards
- Enterprise workflow automation
- Cross-organization benchmarking

---

# Guiding Principle

Every organization using SARTHI should be able to manage its identity, structure, people, policies, branding, and educational operations independently while benefiting from a secure, scalable, and shared platform architecture.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**