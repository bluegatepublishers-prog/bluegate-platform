# SARTHI Hostel & Residential Management Engineering Specification

**Version:** 5.0

**Status:** Engineering Ready

**Module:** Hostel & Residential Management

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Hostel & Residential Management platform provides comprehensive administration of residential facilities within educational institutions.

It manages hostels, residential campuses, room allocation, occupancy, student movement, visitor management, mess operations, discipline, maintenance, health coordination, security, and parent communication.

The platform ensures safe, efficient, and transparent management of residential life.

---

# Scope

The platform is responsible for:

- Hostel administration
- Building management
- Room management
- Bed allocation
- Resident lifecycle
- Warden management
- Visitor management
- Student movement
- Mess management
- Housekeeping
- Maintenance
- Security
- Residential analytics

---

# Design Principles

The platform shall be:

- Student Centric
- Safety First
- Multi-Tenant
- Policy Driven
- Mobile Friendly
- Event Driven
- AI Ready
- Scalable

---

# Architecture

```text
Residential Platform

├── Hostel Manager
├── Building Manager
├── Floor Manager
├── Room Manager
├── Bed Allocation
├── Resident Manager
├── Warden Manager
├── Visitor Manager
├── Student Movement
├── Mess Management
├── Maintenance
├── Security
├── Analytics
└── Audit
```

---

# Hostel Structure

Support:

- Multiple campuses
- Multiple hostels
- Buildings
- Towers
- Blocks
- Floors
- Wings
- Rooms
- Beds

The hierarchy remains configurable.

---

# Hostel Categories

Support:

- Boys hostel
- Girls hostel
- Faculty residence
- Guest house
- International hostel
- Research scholar hostel
- Temporary accommodation

Additional categories may be configured.

---

# Room Management

Each room maintains:

- Room number
- Capacity
- Occupancy
- Room type
- Floor
- Building
- Attached facilities
- Accessibility
- Current status

Room types include:

- Single
- Double
- Triple
- Dormitory
- Suite

---

# Bed Allocation

Support:

- Manual allocation
- Automatic allocation
- Academic-year allocation
- Temporary allocation
- Emergency allocation
- Waiting lists
- Transfers

Allocation history is preserved.

---

# Resident Lifecycle

Track:

- Admission
- Check-in
- Room changes
- Temporary leave
- Vacation
- Disciplinary actions
- Medical isolation
- Graduation
- Check-out

Every stage is auditable.

---

# Warden Management

Maintain:

- Warden profile
- Assigned buildings
- Contact details
- Duty schedules
- Escalation responsibilities
- Performance history

Wardens manage only assigned facilities.

---

# Visitor Management

Support:

- Visitor registration
- Identity verification
- Approved visitor lists
- Visiting hours
- Parent visits
- Emergency visitors
- Entry logs
- Exit logs

Digital approval workflows are supported.

---

# Student Movement

Track:

- Hostel entry
- Hostel exit
- Late entry
- Overnight leave
- Weekend leave
- Campus movement
- Emergency exit

Movement approvals follow institutional policy.

---

# Leave Management

Support:

- Day leave
- Weekend leave
- Vacation leave
- Medical leave
- Emergency leave

Each request includes:

- Purpose
- Destination
- Guardian approval (where applicable)
- Expected return
- Actual return

---

# Mess Management

Support:

- Meal plans
- Menu planning
- Dietary preferences
- Allergies
- Attendance
- Meal coupons
- Guest meals
- Vendor integration

Nutrition reporting is supported.

---

# Housekeeping

Manage:

- Cleaning schedules
- Laundry
- Linen changes
- Room inspections
- Consumables
- Hygiene audits

Tasks are assigned and tracked.

---

# Maintenance

Track:

- Maintenance requests
- Plumbing
- Electrical
- Furniture
- Internet
- Water supply
- Air conditioning
- Safety equipment

Service-level targets are configurable.

---

# Security

Support:

- Digital access control
- Visitor verification
- CCTV integration
- Emergency alerts
- Fire safety
- Evacuation plans
- Incident reporting

Security events are auditable.

---

# Parent Integration

Notify parents regarding:

- Hostel admission
- Room allocation
- Leave approval
- Late return
- Emergency events
- Medical incidents
- Visitor approvals

Notification preferences are configurable.

---

# Health Integration

Integrate with Health Management for:

- Medical visits
- Isolation rooms
- Medication tracking
- Vaccination records
- Emergency treatment

Health data follows privacy policies.

---

# Finance Integration

Support:

- Hostel fees
- Mess fees
- Security deposits
- Utility charges
- Damage recovery
- Refunds

Financial processing integrates with Finance & Fee Management.

---

# AI Residential Assistant

Provide AI-assisted:

- Occupancy optimization
- Room allocation recommendations
- Maintenance prediction
- Utility consumption forecasting
- Resident wellbeing indicators
- Mess demand forecasting

AI outputs remain advisory.

---

# APIs

Examples:

```http
GET /api/v1/hostels

POST /api/v1/hostels

GET /api/v1/rooms

POST /api/v1/allocations

POST /api/v1/leave-requests

GET /api/v1/mess/menus

POST /api/v1/maintenance
```

---

# Events

Publish:

- HostelCreated
- RoomAllocated
- ResidentCheckedIn
- ResidentCheckedOut
- LeaveApproved
- VisitorApproved
- MaintenanceRaised
- MaintenanceCompleted
- EmergencyReported

Events integrate with the SARTHI Event Bus.

---

# Security

Enforce:

- Tenant isolation
- Building-level permissions
- Visitor verification
- Secure resident records
- Audit logging

Access is role-based and least-privilege.

---

# Audit Events

Generate records for:

- Hostel created
- Room assigned
- Resident transferred
- Leave approved
- Visitor entered
- Maintenance completed
- Security incident reported
- Resident checked out

Audit records are immutable.

---

# Analytics

Track:

- Occupancy rate
- Room utilization
- Leave frequency
- Maintenance response time
- Visitor volume
- Mess attendance
- Utility consumption
- Safety incidents

---

# Performance

Support:

- Thousands of buildings
- Millions of movement records
- Real-time occupancy updates
- Horizontal scaling
- High availability

---

# Acceptance Criteria

✓ Hostel administration

✓ Room and bed allocation

✓ Visitor management

✓ Student movement tracking

✓ Mess management

✓ Maintenance workflows

✓ AI residential insights

✓ Complete audit logging

---

# Future Enhancements

- Smart room access
- IoT-enabled occupancy monitoring
- Energy optimization
- Facial recognition entry (subject to institutional policy)
- Digital twin of residential campuses
- Sustainability dashboards
- Predictive wellbeing analytics

---

# Guiding Principle

Residential life is an extension of the educational experience. SARTHI should provide institutions with a secure, efficient, and compassionate residential management platform that prioritizes student safety, wellbeing, operational transparency, and seamless integration with the wider education ecosystem.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**