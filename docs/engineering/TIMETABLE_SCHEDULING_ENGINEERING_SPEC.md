# SARTHI Timetable & Scheduling Engineering Specification

**Version:** 4.0

**Status:** Engineering Ready

**Module:** Timetable & Scheduling

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Timetable & Scheduling platform manages academic scheduling across educational institutions using SARTHI.

It coordinates teachers, students, classrooms, laboratories, activities, examinations, events, meetings, and institutional resources while minimizing scheduling conflicts and maximizing resource utilization.

The platform provides manual, assisted, and AI-optimized scheduling capabilities.

---

# Scope

The platform is responsible for:

- Academic timetables
- Teacher schedules
- Student schedules
- Classroom scheduling
- Laboratory scheduling
- Examination schedules
- Event scheduling
- Meeting scheduling
- Resource allocation
- Conflict detection
- Schedule optimization
- Calendar synchronization

---

# Design Principles

The platform shall be:

- Institution Aware
- Multi-Campus Ready
- Conflict Free
- AI Ready
- Mobile First
- Event Driven
- Configurable
- Scalable

---

# Architecture

```
Scheduling Platform

├── Academic Calendar
├── Timetable Engine
├── Teacher Scheduler
├── Student Scheduler
├── Classroom Allocator
├── Laboratory Scheduler
├── Examination Scheduler
├── Event Scheduler
├── Resource Manager
├── Conflict Detection
├── Optimization Engine
└── Calendar Integration
```

---

# Scheduling Hierarchy

Institution

↓

Academic Year

↓

Term

↓

Week

↓

Day

↓

Periods

↓

Activities

↓

Resources

---

# Academic Timetable

Support:

- Weekly timetables
- Rotating schedules
- Block scheduling
- Semester schedules
- Multi-shift schools
- Custom institutional patterns

Timetables are version controlled.

---

# Teacher Scheduling

Schedule:

- Teaching periods
- Preparation periods
- Meetings
- Supervision duties
- Club activities
- Professional development

Teacher availability is validated automatically.

---

# Student Scheduling

Generate personalized schedules for:

- Classes
- Electives
- Laboratories
- Clubs
- Sports
- Special education support
- Remedial sessions

Schedules update dynamically when changes occur.

---

# Classroom Management

Allocate:

- Classrooms
- Laboratories
- Libraries
- Auditoriums
- Sports facilities
- Activity rooms

Capacity and equipment requirements are considered.

---

# Resource Allocation

Manage:

- Projectors
- Smart boards
- Computers
- Laboratory equipment
- Sports equipment
- Shared institutional resources

Resources cannot be double-booked.

---

# Examination Scheduling

Support:

- Unit tests
- Periodic assessments
- Practical examinations
- Mid-term examinations
- Final examinations
- Board examinations

Examination schedules avoid conflicts.

---

# Event Scheduling

Support:

- Parent meetings
- School assemblies
- Competitions
- Workshops
- Cultural events
- Sports events
- Professional development

Events integrate with calendars and notifications.

---

# Conflict Detection

Detect:

- Teacher conflicts
- Student conflicts
- Classroom conflicts
- Laboratory conflicts
- Examination conflicts
- Resource conflicts

Conflicts are identified before publication.

---

# Optimization

Optimize for:

- Teacher workload
- Classroom utilization
- Student movement
- Resource utilization
- Examination spacing
- Institutional preferences

Optimization rules are configurable.

---

# Calendar Integration

Synchronize with:

- Teacher dashboard
- Student dashboard
- Parent dashboard
- School administration
- Notifications
- External calendar systems (where enabled)

---

# AI Scheduling Assistant

Provide AI-assisted:

- Timetable generation
- Conflict resolution
- Resource optimization
- Schedule recommendations
- Workload balancing
- Examination planning

Human approval is required before publication.

---

# APIs

Examples:

GET /api/v1/timetable

POST /api/v1/timetable

GET /api/v1/schedules/teacher/{id}

GET /api/v1/schedules/student/{id}

POST /api/v1/examinations/schedule

GET /api/v1/resources/availability

---

# Security

Enforce:

- Tenant isolation
- Role-based permissions
- Schedule publication controls
- Audit logging

Only authorized users may modify schedules.

---

# Audit Events

Generate events for:

- Timetable created
- Timetable published
- Schedule updated
- Conflict detected
- Examination scheduled
- Resource allocated
- AI schedule generated

Audit records are immutable.

---

# Analytics

Track:

- Classroom utilization
- Teacher workload
- Resource utilization
- Schedule conflicts
- Schedule changes
- Examination distribution
- AI optimization effectiveness

---

# Performance

Support:

- Millions of schedule entries
- Large multi-campus institutions
- Real-time schedule updates
- Horizontal scaling
- High availability

---

# Acceptance Criteria

✓ Academic timetable management

✓ Teacher scheduling

✓ Student scheduling

✓ Resource allocation

✓ Conflict detection

✓ AI-assisted optimization

✓ Calendar synchronization

✓ Complete audit logging

---

# Future Enhancements

- Predictive timetable optimization
- Traffic-aware campus scheduling
- Transportation integration
- Substitute teacher automation
- Energy-efficient room scheduling
- Cross-campus scheduling

---

# Guiding Principle

Scheduling should reduce administrative effort while ensuring that teachers, students, parents, and administrators always have access to accurate, conflict-free, and up-to-date academic schedules that support effective learning.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**