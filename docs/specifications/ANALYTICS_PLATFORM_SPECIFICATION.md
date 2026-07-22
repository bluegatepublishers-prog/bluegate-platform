# SARTHI Analytics Platform Specification

**Version:** 1.0

**Status:** Draft

**Module:** Analytics Platform

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Analytics Platform provides centralized reporting, dashboards, insights, forecasting, and decision support across the SARTHI ecosystem.

It transforms operational data into actionable information for learners, educators, institutions, publishers, administrators, and platform operators.

---

# Vision

The Analytics Platform shall become the intelligence layer of SARTHI, enabling evidence-based educational and operational decisions while respecting privacy, permissions, and institutional ownership.

---

# Design Principles

Analytics must be:

- Accurate
- Timely
- Explainable
- Secure
- Role-based
- Configurable
- Actionable
- Privacy-first

Analytics exist to support decisions, not simply display data.

---

# Analytics Architecture

```
Operational Systems
│
├── Identity
├── Teacher Platform
├── Student Platform
├── Parent Platform
├── Publisher Platform
├── School ERP
├── Coaching ERP
├── University Platform
├── Marketplace
├── Assessment Engine
├── Resource Management
└── AI Services
        │
        ▼
Event Collection
        │
        ▼
Analytics Pipeline
        │
        ├── Data Validation
        ├── Aggregation
        ├── Transformation
        ├── KPI Calculation
        └── Historical Storage
        │
        ▼
Analytics Services
        │
        ├── Dashboards
        ├── Reports
        ├── Forecasting
        ├── Alerts
        ├── AI Insights
        └── Data Export
```

---

# Core Services

1. Dashboard Service
2. Reporting Service
3. KPI Engine
4. Learning Analytics
5. Institutional Analytics
6. Business Analytics
7. AI Analytics
8. Forecasting
9. Alerting
10. Data Export

---

# Executive Dashboard

Provides:

- Active users
- Institution growth
- Revenue
- Platform usage
- Resource usage
- AI adoption
- Assessment statistics
- Marketplace activity
- System health

---

# Teacher Analytics

Teachers can view:

- Lesson completion
- Resource usage
- Student participation
- Assignment completion
- Assessment results
- Learning gaps
- Competency mastery
- Classroom trends

---

# Student Analytics

Students can view:

- Learning progress
- Subject performance
- Competency growth
- Attendance
- Assignment completion
- Assessment history
- Learning streaks
- Achievement milestones

Students see only their own information.

---

# Parent Analytics

Parents can view:

- Child progress
- Attendance
- Homework completion
- Assessment trends
- Teacher feedback
- Learning recommendations

Comparisons with unrelated students are not displayed.

---

# Publisher Analytics

Publishers can monitor:

- Book adoption
- Resource downloads
- Teacher engagement
- School engagement
- Inspection copy conversions
- Sales performance
- Digital content usage
- Regional trends

---

# School Analytics

Schools can monitor:

- Admissions
- Enrollment
- Attendance
- Academic performance
- Fee collection
- Teacher workload
- Parent engagement
- Resource utilization

---

# Coaching Analytics

Support:

- Batch performance
- Test results
- Student rankings
- Revenue
- Attendance
- Faculty performance
- Admission trends

---

# University Analytics

Universities can monitor:

- Enrollment
- Credits completed
- Graduation rates
- Research output
- Faculty workload
- Placement statistics
- Financial performance

---

# Marketplace Analytics

Track:

- Sales
- Revenue
- Active licenses
- Product popularity
- Search trends
- Reviews
- Subscription growth
- Creator earnings

---

# AI Analytics

Monitor:

- Feature usage
- Token consumption
- Model performance
- Provider usage
- Cost
- User satisfaction
- Response quality
- Safety events

---

# Learning Analytics

Support:

- Learning paths
- Competency mastery
- Curriculum coverage
- Weak topics
- Learning gaps
- Improvement trends
- Time on task

---

# Predictive Analytics

May forecast:

- Student risk
- Attendance decline
- Fee collection
- Resource demand
- Enrollment
- Teacher workload
- Content popularity

Predictions assist decision-making and should be accompanied by confidence indicators.

---

# KPI Engine

KPIs should be:

- Configurable
- Versioned
- Auditable
- Comparable across time
- Institution-aware

Examples:

- Attendance %
- Pass %
- Completion %
- Engagement Index
- Resource Reuse
- AI Adoption
- Customer Satisfaction

---

# Reports

Support:

- Scheduled reports
- On-demand reports
- Printable reports
- PDF
- Excel
- CSV
- Dashboard snapshots

---

# Dashboards

Dashboards support:

- Filters
- Drill-down
- Time comparison
- Saved views
- Export
- Responsive layouts

---

# Alerts

Generate alerts for:

- Attendance drops
- Learning gaps
- Failed assessments
- Low engagement
- Revenue anomalies
- AI quota limits
- Security incidents

Alerts should be configurable.

---

# Data Warehouse

Historical analytics are stored separately from operational systems.

Support:

- Aggregated metrics
- Trend analysis
- Historical reporting
- Forecasting
- Long-term storage

---

# Security

Analytics enforce:

- Tenant isolation
- Role-based permissions
- Data masking
- Encryption
- Audit logging

Users may access only authorized analytics.

---

# Audit

Audit events include:

- Report generation
- Dashboard sharing
- KPI changes
- Export requests
- Analytics configuration
- Forecast execution

---

# Accessibility

Support:

- Screen readers
- Keyboard navigation
- High contrast mode
- Accessible charts
- Alternative data tables

---

# Success Metrics

The Analytics Platform should improve:

- Decision quality
- Educational outcomes
- Operational efficiency
- Transparency
- Strategic planning
- Platform adoption

---

# Future Enhancements

Future capabilities may include:

- Natural language analytics
- Conversational dashboards
- AI-generated executive summaries
- Predictive institutional benchmarking
- Real-time streaming analytics
- Cross-region trend analysis
- Digital twin simulations

---

# Guiding Principle

The Analytics Platform exists to transform trusted educational and operational data into meaningful insights that help learners, educators, institutions, publishers, and administrators make better decisions while preserving privacy, transparency, and institutional ownership.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**