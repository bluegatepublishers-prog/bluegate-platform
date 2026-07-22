# SARTHI Reporting Engine Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Reporting Engine

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Reporting Engine provides centralized report generation, scheduling, distribution, archival, and export capabilities for every module within the SARTHI platform.

It transforms analytical data into human-readable reports for students, parents, teachers, institutions, publishers, administrators, and executives.

The Reporting Engine consumes curated datasets from the Analytics Warehouse and operational APIs where appropriate.

---

# Scope

The Reporting Engine is responsible for:

- Report generation
- Report templates
- Scheduled reports
- On-demand reports
- Dashboard exports
- Multi-format exports
- Report distribution
- Report archival
- Report security
- Report analytics
- Audit logging

---

# Design Principles

The Reporting Engine shall be:

- Data Source Independent
- Template Driven
- Tenant Aware
- Secure
- Scalable
- Configurable
- Auditable
- Extensible

---

# Architecture

```
Analytics Warehouse
Operational APIs

↓

Reporting API

↓

Reporting Engine

├── Report Manager
├── Template Engine
├── Query Executor
├── Scheduling Engine
├── Export Engine
├── Distribution Service
├── Archive Manager
├── Analytics
└── Audit Logger

↓

Users
Dashboards
Email
Downloads
External Systems
```

---

# Report Categories

Support:

- Academic Reports
- Student Progress Reports
- Teacher Performance Reports
- School Performance Reports
- Institution Reports
- Publisher Reports
- Financial Reports
- Marketplace Reports
- Subscription Reports
- License Reports
- AI Usage Reports
- Operational Reports
- Security Reports
- Compliance Reports
- Executive Reports

---

# Report Lifecycle

Draft

↓

Validated

↓

Generated

↓

Reviewed (optional)

↓

Published

↓

Distributed

↓

Archived

---

# Report Templates

Templates define:

- Layout
- Branding
- Language
- Data Sources
- Filters
- Charts
- Tables
- Export Formats

Templates are version-controlled.

---

# Report Formats

Support:

- PDF
- Excel
- CSV
- JSON
- HTML
- PowerPoint
- Print-friendly output

Additional formats remain extensible.

---

# Scheduling

Support:

- One-time
- Daily
- Weekly
- Monthly
- Quarterly
- Annual
- Academic Term
- Event-triggered

Schedules are tenant configurable.

---

# Distribution

Support:

- Download
- Email
- Secure Portal
- API
- Cloud Storage
- Institutional Delivery

Distribution policies are configurable.

---

# Filtering

Reports support filtering by:

- Tenant
- Institution
- Grade
- Class
- Subject
- Teacher
- Student
- Parent
- Publisher
- Academic Year
- Assessment
- Date Range
- Geography

---

# Branding

Each tenant may customize:

- Logo
- Color palette
- Header
- Footer
- Watermark
- Signature blocks
- Contact information

Branding is applied during rendering.

---

# Export Engine

Support:

- Bulk exports
- Password-protected reports
- Digitally signed reports
- Watermarked reports
- Compressed archives

---

# Archival

Maintain:

- Historical reports
- Version history
- Regenerated copies
- Access history
- Retention policies

Archived reports remain searchable.

---

# APIs

Examples:

POST /api/v1/reports/generate

GET /api/v1/reports/{id}

POST /api/v1/reports/schedule

GET /api/v1/reports/templates

POST /api/v1/reports/export

GET /api/v1/reports/archive

---

# Security

Enforce:

- Tenant isolation
- Role-based access
- Encryption
- Watermarking
- Audit logging

Sensitive reports require explicit authorization.

---

# Audit Events

Generate events for:

- Report generated
- Template updated
- Report exported
- Report downloaded
- Report shared
- Schedule created
- Archive accessed

Audit records are immutable.

---

# Analytics

Track:

- Most generated reports
- Export frequency
- Download counts
- Report execution time
- Scheduling success
- Distribution success
- User engagement

---

# Performance

Support:

- Millions of report executions
- Parallel rendering
- Horizontal scaling
- Cached report generation
- High availability

---

# Acceptance Criteria

✓ Template-driven reports

✓ Scheduled reporting

✓ Multi-format export

✓ Tenant branding

✓ Distribution workflows

✓ Report archival

✓ Analytics

✓ Complete audit logging

---

# Future Enhancements

- AI-generated executive summaries
- Natural language report builder
- Conversational analytics
- Interactive drill-down reports
- Live streaming dashboards
- Collaborative annotations
- Automated anomaly detection

---

# Guiding Principle

The Reporting Engine converts trusted analytical data into clear, secure, and actionable information, enabling every stakeholder in the SARTHI ecosystem to make informed academic, operational, and business decisions.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**