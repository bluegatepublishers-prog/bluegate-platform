# SARTHI Multi-Tenant Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Multi-Tenant Engine

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Multi-Tenant Engine provides secure isolation, configuration, branding, feature management, licensing, and organizational hierarchy for every tenant operating on the SARTHI platform.

It enables multiple independent organizations to share the same platform while ensuring complete logical separation of data and operations.

---

# Scope

The Multi-Tenant Engine is responsible for:

- Tenant lifecycle
- Organization hierarchy
- Tenant configuration
- Branding
- Feature flags
- Subscription plans
- Data isolation
- Cross-tenant governance
- Tenant analytics
- Tenant APIs

---

# Supported Tenant Types

The engine supports:

- Publisher
- School
- Coaching Institute
- University
- Corporate Learning
- Educational NGO
- Government Department
- Independent Creator
- Marketplace Seller
- Enterprise Customer

New tenant types should be configurable.

---

# Tenant Lifecycle

Prospect

↓

Registration

↓

Verification

↓

Provisioning

↓

Configuration

↓

Active

↓

Suspended

↓

Archived

↓

Deleted (Soft Delete)

Lifecycle transitions generate audit events.

---

# Tenant Hierarchy

```
Platform
│
├── Tenant
│
├── Organization
│
├── Campus / Branch
│
├── Department
│
├── Team
│
└── Users
```

Each level inherits configuration where appropriate.

---

# Tenant Profile

Each tenant maintains:

- Name
- Legal Name
- Registration Number
- Tax Information
- Logo
- Brand Colors
- Contact Details
- Address
- Time Zone
- Locale
- Currency
- Academic Calendar
- Status

---

# Tenant Configuration

Support configurable settings for:

- Academic policies
- Branding
- Notifications
- Authentication
- Password policy
- Language
- Regional settings
- AI features
- Marketplace
- Integrations

Configurations should support inheritance and overrides.

---

# Branding

Each tenant may customize:

- Logo
- Colors
- Fonts
- Email templates
- Certificates
- Report templates
- Login page
- Domain (future)

Branding is isolated to the tenant.

---

# Feature Flags

Support:

- Platform-wide features
- Tenant-specific features
- Beta features
- Experimental features
- Subscription features

Feature evaluation should be cached for performance.

---

# Subscription Management

Each tenant has:

- Plan
- Billing status
- Renewal date
- Seat limits
- Storage quota
- AI quota
- API quota
- Marketplace permissions

---

# Tenant Isolation

Every request validates:

User

↓

Membership

↓

Tenant

↓

Role

↓

Permission

↓

Resource

↓

Operation

↓

Decision

Cross-tenant data access is prohibited unless explicitly authorized by platform-level policies.

---

# Resource Ownership

Every resource belongs to exactly one tenant unless explicitly marked as platform-managed.

Examples:

- Books
- Resources
- Students
- Teachers
- Assessments
- Reports
- Files
- Analytics

---

# Shared Resources

The platform may provide:

- Public curriculum
- Documentation
- Platform templates
- Sample assessments
- System resources

Shared resources are read-only unless copied into a tenant.

---

# Tenant Provisioning

Provisioning creates:

- Tenant record
- Default administrator
- Default roles
- Default permissions
- Branding defaults
- Storage allocation
- Analytics workspace
- AI workspace

Provisioning should be automated.

---

# Tenant Suspension

Suspension disables:

- User logins
- New resource creation
- Marketplace activity
- AI requests

Historical data remains preserved.

---

# Tenant Archive

Archived tenants:

- Become read-only
- Remain searchable by platform administrators
- Retain audit logs
- Retain billing history

---

# Tenant APIs

Examples:

GET /api/v1/tenants

GET /api/v1/tenants/{id}

POST /api/v1/tenants

PATCH /api/v1/tenants/{id}

GET /api/v1/tenants/{id}/settings

PATCH /api/v1/tenants/{id}/settings

---

# Security

The engine enforces:

- Tenant isolation
- Role validation
- Membership validation
- Resource ownership
- Audit logging
- Encryption
- Rate limiting

---

# Audit Events

Generate audit events for:

- Tenant creation
- Tenant activation
- Suspension
- Reactivation
- Branding changes
- Configuration changes
- Subscription updates
- Feature flag changes
- Administrator changes

Audit records are immutable.

---

# Performance

The engine should support:

- Millions of users
- Thousands of tenants
- Low-latency permission evaluation
- Cached tenant configuration
- Horizontal scaling

---

# Acceptance Criteria

✓ Tenant isolation enforced

✓ Branding isolated

✓ Configuration inheritance supported

✓ Automated provisioning

✓ Feature flags operational

✓ Subscription limits enforced

✓ Complete audit logging

✓ API documentation complete

---

# Future Enhancements

- Custom domains
- Regional hosting
- Cross-region replication
- White-label mobile apps
- Multi-currency billing
- Enterprise federation
- Government cloud deployments

---

# Guiding Principle

Every tenant should experience SARTHI as its own secure, configurable, and independent platform while benefiting from a shared, scalable infrastructure.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**