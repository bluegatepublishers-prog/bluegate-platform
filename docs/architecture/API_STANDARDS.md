# SARTHI API Standards

**Version:** 1.0

**Status:** Draft

**Product:** SARTHI

**Related Documents:**
- SARTHI Constitution
- Master PRD
- System Architecture
- Security Architecture
- Identity Architecture

---

# Purpose

This document defines the API design standards for the SARTHI Education Operating System.

All internal and external APIs shall follow these standards to ensure consistency, security, maintainability, and scalability.

---

# API Philosophy

Every API should be:

- Predictable
- Secure
- Versioned
- Documented
- Consistent
- Easy to consume
- Backward compatible where practical

APIs represent contracts between services and clients.

Breaking changes should be avoided.

---

# Architectural Style

SARTHI primarily uses REST APIs.

Future capabilities may include:

- GraphQL
- Event APIs
- Webhooks
- Streaming APIs
- AI APIs

REST remains the primary integration standard.

---

# Base URL

Examples:

```
/api/v1/
```

Future versions:

```
/api/v2/
```

Versioning must be explicit.

---

# Resource Naming

Use nouns.

Good:

```
/books
/students
/resources
/teachers
```

Avoid verbs.

Bad:

```
/getBooks
/createStudent
```

---

# HTTP Methods

GET

Retrieve resources.

POST

Create resources.

PUT

Replace an existing resource.

PATCH

Update part of a resource.

DELETE

Delete or archive a resource.

---

# Standard Response Format

Success

```json
{
  "success": true,
  "data": {}
}
```

Failure

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Required field missing."
  }
}
```

Responses should be predictable across all modules.

---

# HTTP Status Codes

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Too Many Requests

500 Internal Server Error

---

# Validation

Every request must be validated.

Validation includes:

- Required fields
- Data types
- Length
- Formats
- Business rules

Validation should occur before database operations.

---

# Authentication

Protected APIs require authentication.

Examples:

- Session
- JWT
- OAuth
- Enterprise SSO (future)

Authentication should never be optional for protected resources.

---

# Authorization

Authorization must verify:

- User identity
- Tenant membership
- Role
- Permission
- Subscription
- Feature access

Every protected endpoint performs authorization checks.

---

# Pagination

Large collections should support pagination.

Example:

```
?page=1
&pageSize=25
```

Response:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 25,
  "totalItems": 240,
  "totalPages": 10
}
```

---

# Sorting

Example:

```
?sort=name
?sort=-createdAt
```

Ascending:

```
sort=name
```

Descending:

```
sort=-createdAt
```

---

# Filtering

Example:

```
?status=ACTIVE

?subject=Math

?class=6

?published=true
```

Filters should be composable.

---

# Searching

Search endpoints should support:

- Keyword
- Subject
- Tags
- Curriculum
- Language

Example:

```
?q=fractions
```

---

# Idempotency

Operations that may be retried should support idempotency where appropriate.

Examples:

- Payments
- Quote creation
- Imports

Clients may send an idempotency key to prevent duplicate processing.

---

# File Uploads

Uploads should support:

- Images
- PDFs
- Videos
- Documents

Validation includes:

- MIME type
- Size
- Ownership
- Authorization

The API returns metadata and storage references rather than exposing storage implementation details.

---

# Rate Limiting

Sensitive endpoints should be rate limited.

Examples:

- Login
- AI
- Uploads
- Password reset
- Public forms

Rate limits should be configurable.

---

# Audit Logging

Important API operations should create audit events.

Examples:

- User updates
- Permission changes
- Book publication
- Assessment submission

Audit records should include:

- User
- Tenant
- Timestamp
- Action
- Result

---

# Error Handling

Errors should be:

- Consistent
- Human-readable
- Machine-readable
- Secure

Do not expose:

- Stack traces
- SQL queries
- Internal paths
- Secrets

---

# API Documentation

Every endpoint should include:

- Purpose
- Authentication requirements
- Request schema
- Response schema
- Error responses
- Examples

Documentation should be generated where practical.

---

# Webhooks

Future webhook support may include:

- Resource Published
- User Registered
- Assessment Completed
- Payment Received
- Subscription Changed

Webhook deliveries should be signed and retry failed deliveries.

---

# Event Publishing

Major platform events should be publishable.

Examples:

- Student Created
- Book Published
- Resource Uploaded
- Teacher Approved

Events enable future integrations and automation.

---

# API Versioning

Breaking changes require a new API version.

Minor improvements should preserve compatibility.

Deprecated endpoints should remain available for a defined transition period.

---

# Performance

APIs should:

- Minimize latency
- Avoid unnecessary payloads
- Use pagination
- Support caching where appropriate
- Prevent N+1 query patterns

---

# Security

Every API must support:

- HTTPS
- Authentication
- Authorization
- Input validation
- Output filtering
- Audit logging
- Rate limiting

Security requirements apply equally to internal and external APIs.

---

# Future API Capabilities

Future enhancements may include:

- GraphQL Gateway
- gRPC for internal services
- Real-time subscriptions
- AI streaming responses
- SDK generation
- Developer Portal

---

# Guiding Principle

APIs are long-term contracts.

Every API should be simple, secure, consistent, well documented, and designed to evolve without disrupting existing integrations.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**