# SARTHI Transportation Management Engineering Specification

**Version:** 5.0

**Status:** Engineering Ready

**Module:** Transportation Management

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Transportation Management platform manages safe, efficient, and transparent transportation services for educational institutions using SARTHI.

It supports route planning, vehicle management, driver administration, student allocation, GPS tracking, attendance integration, emergency handling, transport fee integration, and parent communication.

The platform ensures that every transportation activity is secure, traceable, and optimized.

---

# Scope

The platform is responsible for:

- Vehicle management
- Driver management
- Transport staff management
- Route planning
- Stop management
- Student transport allocation
- Live vehicle tracking
- Boarding & drop verification
- Transport attendance
- Emergency management
- Transport fee integration
- Maintenance scheduling
- Transport analytics

---

# Design Principles

The platform shall be:

- Safety First
- Mobile First
- Real-Time
- Multi-Tenant
- Event Driven
- AI Ready
- Secure
- Scalable

---

# Architecture

```text
Transportation Platform

├── Vehicle Manager
├── Driver Manager
├── Route Planner
├── Stop Manager
├── Student Allocation
├── GPS Tracking
├── Boarding Verification
├── Drop Verification
├── Maintenance Manager
├── Emergency Manager
├── Notifications
├── Analytics
└── Audit
```

---

# Vehicle Management

Maintain:

- Vehicle ID
- Registration number
- Vehicle type
- Capacity
- Seating layout
- Manufacturer
- Model
- Fuel type
- Insurance
- Fitness certificate
- Pollution certificate
- GPS device
- Camera availability
- Active status

Vehicle documents maintain expiry history.

---

# Driver Management

Track:

- Driver profile
- License
- License validity
- Background verification
- Medical fitness
- Training
- Experience
- Assigned vehicle
- Assigned routes
- Performance history

Drivers cannot operate with expired credentials.

---

# Transport Staff

Support:

- Bus attendants
- Helpers
- Route supervisors
- Fleet managers
- Maintenance staff

Assignments remain auditable.

---

# Route Planning

Support:

- Pickup routes
- Drop routes
- Circular routes
- Shared routes
- Multiple shifts
- Seasonal routes
- Temporary routes

Routes are version controlled.

---

# Bus Stops

Each stop maintains:

- Stop ID
- Name
- GPS coordinates
- Pickup time
- Drop time
- Safety notes
- Active status

Stops support geofencing.

---

# Student Allocation

Assign students to:

- Vehicle
- Route
- Stop
- Academic year

Capacity validation prevents over-allocation.

---

# Live Tracking

Provide:

- Real-time vehicle location
- Route progress
- Estimated arrival time
- Delay alerts
- Geofence entry/exit
- Route deviation alerts

Location history is retained according to policy.

---

# Boarding Verification

Support:

- QR code scanning
- RFID/NFC
- Mobile verification
- Manual confirmation
- Biometric integration

Each boarding event records:

- Student
- Vehicle
- Route
- Stop
- Timestamp
- Operator

---

# Drop Verification

Record:

- Student drop confirmation
- Timestamp
- Stop
- Responsible staff
- Exception notes

Unverified drops generate alerts.

---

# Safety Management

Monitor:

- Vehicle occupancy
- Route deviations
- Speed violations
- Emergency alerts
- Panic button activation
- Driver fatigue indicators (where supported)

Safety incidents trigger configurable workflows.

---

# Maintenance Management

Track:

- Scheduled maintenance
- Repairs
- Inspections
- Fuel usage
- Tyre replacement
- Service history
- Maintenance costs

Vehicles overdue for inspection cannot be scheduled.

---

# Emergency Management

Support:

- Vehicle breakdown
- Medical emergency
- Accident reporting
- Student missing alerts
- Severe weather disruption
- Alternative vehicle allocation

Emergency events integrate with Notifications.

---

# Parent Integration

Notify parents about:

- Vehicle departure
- Vehicle arrival
- Boarding confirmation
- Drop confirmation
- Delays
- Route changes
- Emergency situations

Notification channels are configurable.

---

# Attendance Integration

Transport attendance integrates with:

- Student attendance
- School arrival
- School departure

Institutions configure synchronization rules.

---

# Finance Integration

Support:

- Transport fee plans
- Route-based pricing
- Distance-based pricing
- Concessions
- Billing integration

Financial logic integrates with Finance & Fee Management.

---

# AI Transportation Assistant

Provide AI-assisted:

- Route optimization
- Vehicle utilization
- Delay prediction
- Maintenance prediction
- Fuel optimization
- Capacity planning
- Driver scheduling

AI recommendations require administrative approval.

---

# APIs

Examples:

```http
GET /api/v1/transport/routes

POST /api/v1/transport/routes

GET /api/v1/transport/vehicles

POST /api/v1/transport/students/allocate

GET /api/v1/transport/live

POST /api/v1/transport/emergencies
```

---

# Events

Publish:

- VehicleAssigned
- RoutePublished
- StudentBoarded
- StudentDropped
- VehicleDelayed
- EmergencyRaised
- MaintenanceScheduled
- RouteCompleted

Events integrate with the SARTHI Event Bus.

---

# Security

Enforce:

- Tenant isolation
- Route-level permissions
- Driver authorization
- Secure GPS data
- Audit logging

Location information is protected and retained according to policy.

---

# Audit Events

Generate events for:

- Vehicle registered
- Driver assigned
- Route published
- Student allocated
- Boarding recorded
- Drop verified
- Maintenance completed
- Emergency closed

Audit records are immutable.

---

# Analytics

Track:

- Vehicle utilization
- Route efficiency
- On-time performance
- Boarding accuracy
- Delay frequency
- Fuel consumption
- Maintenance costs
- Safety incidents
- Parent notification success

---

# Performance

Support:

- Thousands of vehicles
- Millions of GPS updates daily
- Real-time tracking
- Horizontal scaling
- High availability

---

# Acceptance Criteria

✓ Vehicle management

✓ Route planning

✓ Student allocation

✓ Live GPS tracking

✓ Boarding verification

✓ Parent notifications

✓ AI route optimization

✓ Complete audit logging

---

# Future Enhancements

- Electric fleet management
- Autonomous vehicle readiness
- Smart traffic integration
- Computer vision safety monitoring
- Driver behaviour analytics
- Carbon footprint reporting
- Multi-institution fleet sharing

---

# Guiding Principle

Transportation is an extension of the educational environment. SARTHI should provide safe, transparent, efficient, and intelligent transportation management that gives institutions operational control while giving families confidence through real-time visibility and proactive communication.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**