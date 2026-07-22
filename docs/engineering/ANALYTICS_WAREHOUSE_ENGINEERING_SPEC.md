# SARTHI Analytics Warehouse Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Analytics Warehouse

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Analytics Warehouse provides a centralized analytical data platform for SARTHI.

Operational systems continue to serve transactional workloads while the warehouse powers reporting, dashboards, forecasting, AI analytics, compliance reporting, and historical trend analysis.

The warehouse is optimized for read-heavy analytical workloads rather than transactional processing.

---

# Scope

The Analytics Warehouse is responsible for:

- Data ingestion
- Event collection
- ETL/ELT pipelines
- Historical storage
- KPI computation
- Data marts
- BI integration
- AI analytics datasets
- Forecasting datasets
- Audit analytics

---

# Design Principles

The warehouse shall be:

- Read Optimized
- Immutable
- Historical
- Tenant Aware
- Privacy Preserving
- Scalable
- Explainable
- Auditable

---

# Architecture

```
Operational Services

↓

Event Bus

↓

Data Ingestion

↓

Raw Data Lake

↓

Transformation Pipeline

↓

Analytics Warehouse

├── Fact Tables
├── Dimension Tables
├── KPI Engine
├── Data Marts
├── AI Feature Store
├── Forecast Store
├── Reporting Views
└── Analytics API

↓

Dashboards
Reports
AI Services
BI Tools
```

---

# Data Sources

The warehouse receives data from:

- Identity Service
- Multi-Tenant Engine
- Teacher Platform
- Student Platform
- Parent Platform
- Publisher Platform
- School ERP
- Coaching ERP
- University Platform
- Marketplace
- Assessment Delivery
- Evaluation
- Resource Management
- Search
- AI Gateway
- Workflow Engine
- Notification Service
- Audit Service

---

# Data Categories

Support:

- User Activity
- Academic Activity
- Resource Usage
- Assessment Results
- AI Usage
- Marketplace Activity
- Subscription Data
- Operational Metrics
- Security Events
- Financial Metrics

---

# Data Pipeline

Operational Event

↓

Validation

↓

Enrichment

↓

Transformation

↓

Aggregation

↓

Warehouse Storage

↓

Reporting

↓

Archival

---

# Warehouse Model

Use a dimensional model.

Facts:

- Assessment Fact
- Resource Fact
- User Activity Fact
- AI Usage Fact
- Marketplace Fact
- Revenue Fact
- Notification Fact
- Workflow Fact

Dimensions:

- User
- Tenant
- Organization
- Time
- Subject
- Grade
- Institution
- Curriculum
- Resource
- Assessment
- Geography

---

# Time Dimension

Support:

- Year
- Academic Year
- Quarter
- Month
- Week
- Day
- Hour

Academic calendars remain tenant-aware.

---

# Data Marts

Examples:

- Executive Mart
- Academic Mart
- Finance Mart
- Marketplace Mart
- AI Analytics Mart
- Resource Analytics Mart
- School Performance Mart
- University Analytics Mart

---

# KPI Engine

Compute:

- Attendance
- Completion
- Assessment Scores
- Learning Growth
- Teacher Productivity
- Student Engagement
- AI Adoption
- Revenue
- Marketplace Growth
- Subscription Retention

KPI definitions are version-controlled.

---

# Historical Storage

Retain:

- Historical facts
- Slowly changing dimensions
- Trend history
- Archived metrics
- Snapshot data

Historical data is never overwritten.

---

# Forecast Store

Support datasets for:

- Enrollment prediction
- Revenue forecasting
- Student performance prediction
- Resource demand
- AI usage forecasting
- Infrastructure planning

---

# AI Feature Store

Provide reusable datasets for:

- Recommendation models
- Learning analytics
- Dropout prediction
- Assessment prediction
- Content recommendation
- Institutional benchmarking

Feature definitions are versioned.

---

# APIs

Examples:

GET /api/v1/analytics/kpi

GET /api/v1/analytics/dashboard

GET /api/v1/analytics/report

GET /api/v1/analytics/export

POST /api/v1/analytics/query

---

# Security

Enforce:

- Tenant isolation
- Row-level security
- Column masking
- Encryption
- Audit logging

Personally identifiable information is protected.

---

# Audit Events

Generate events for:

- Warehouse refresh
- KPI publication
- Report execution
- Dataset export
- Forecast generation
- Feature publication

---

# Performance

Support:

- Billions of analytical records
- Incremental loading
- Parallel processing
- Horizontal scaling
- High availability
- Fast dashboard queries

---

# Acceptance Criteria

✓ Central warehouse

✓ Historical retention

✓ Dimensional model

✓ Data marts

✓ KPI engine

✓ AI feature store

✓ Forecast datasets

✓ Complete audit logging

---

# Future Enhancements

- Real-time streaming analytics
- Digital twins
- Federated analytics
- Lakehouse architecture
- Cross-region analytics
- Self-service analytics
- AI-generated business insights

---

# Guiding Principle

The Analytics Warehouse provides a trusted, scalable, and historical foundation for every analytical capability within SARTHI, ensuring operational systems remain fast while delivering deep educational and business intelligence.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**