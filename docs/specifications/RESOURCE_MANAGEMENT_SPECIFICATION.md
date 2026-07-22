# SARTHI Resource Management Specification

**Version:** 1.0

**Status:** Draft

**Module:** Resource Management

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Resource Management Service provides a centralized platform for storing, organizing, versioning, securing, searching, licensing, and distributing educational resources across the SARTHI ecosystem.

It serves as the single source of truth for all digital learning assets.

---

# Vision

The Resource Management Service shall become the unified digital library powering every educational experience within SARTHI while ensuring security, scalability, discoverability, and intellectual property protection.

---

# Supported Resource Types

The service supports:

- PDF
- eBook
- Word Documents
- Presentations
- Videos
- Audio
- Images
- Worksheets
- Lesson Plans
- Assessments
- Question Banks
- Interactive HTML5 Content
- SCORM Packages
- ZIP Archives
- Code Samples
- AI Generated Content
- External Links

The system shall allow new resource types without schema redesign.

---

# Resource Lifecycle

Draft

↓

Review

↓

Approval

↓

Published

↓

Available

↓

Updated

↓

Deprecated

↓

Archived

↓

Deleted (Soft Delete)

All lifecycle transitions are audited.

---

# Resource Ownership

Resources may belong to:

- Publisher
- School
- Coaching Institute
- University
- Teacher
- Student
- Educational Creator
- Organization
- Marketplace Seller

Ownership determines permissions and licensing.

---

# Main Modules

1. Resource Library
2. Categories
3. Collections
4. Version Management
5. File Storage
6. Metadata
7. Licensing
8. Search
9. Sharing
10. Analytics
11. AI Tagging
12. Settings

---

# Resource Metadata

Each resource stores:

- Title
- Description
- Category
- Subject
- Class
- Curriculum
- Language
- Keywords
- Tags
- Author
- Publisher
- Institution
- License
- Version
- Thumbnail
- Preview
- File Size
- Duration (if applicable)
- Accessibility Information

Metadata must remain searchable.

---

# Categories

Resources may belong to one or more categories:

- Books
- Worksheets
- Lesson Plans
- Videos
- Presentations
- Assessments
- Teacher Guides
- Student Notes
- Laboratory Manuals
- AI Resources
- Templates

Categories are configurable.

---

# Collections

Collections group related resources.

Examples:

- Class 6 Science
- NEP Resources
- Mathematics Practice
- Olympiad Preparation
- Teacher Training

Collections may be shared across tenants where licensing permits.

---

# Version Management

Every resource supports:

- Version history
- Change log
- Rollback
- Draft versions
- Published versions
- Approval workflow

Historical versions remain available for audit.

---

# File Storage

Support:

- Cloud storage
- CDN delivery
- Chunked uploads
- Large file uploads
- Streaming media
- Secure downloads
- File integrity verification

Storage implementation should remain abstracted.

---

# Permissions

Access may be:

- Private
- Organization
- Institution
- Classroom
- Teacher Only
- Student Only
- Parent
- Marketplace
- Public

Permissions combine with licensing rules.

---

# Sharing

Resources may be shared:

- Direct link
- Classroom
- Institution
- Organization
- Marketplace
- QR Code
- Temporary access link

Sharing should respect permissions.

---

# Search

Search supports:

- Keyword
- Subject
- Chapter
- Curriculum
- Class
- Language
- Tags
- Author
- Institution
- Resource Type

Advanced filters remain available.

---

# AI Resource Assistant

AI may:

- Generate metadata
- Generate summaries
- Suggest tags
- Detect duplicates
- Recommend collections
- Identify accessibility improvements
- Translate metadata
- Recommend related resources

AI suggestions require review before publication.

---

# Licensing

Support:

- Free
- Institutional
- Subscription
- Marketplace License
- Creative Commons
- Commercial
- Internal Only

License enforcement is automatic.

---

# Downloads

Track:

- Download count
- Unique users
- Institution usage
- Device type
- Geographic region
- Last accessed

Analytics respect privacy regulations.

---

# Analytics

Analytics include:

- Resource popularity
- Downloads
- Completion rates
- Teacher engagement
- Student engagement
- Search trends
- Licensing usage
- Storage utilization

---

# Security

The service enforces:

- Tenant isolation
- Encryption at rest
- Encryption in transit
- Malware scanning
- Virus detection
- MIME validation
- File integrity verification
- Permission validation

---

# Audit

Audit events include:

- Upload
- Update
- Publication
- Download
- Permission changes
- Deletion
- License changes

Audit records are immutable.

---

# Accessibility

Resources should support:

- Alternative text
- Captions
- Transcripts
- Accessible PDFs
- Keyboard navigation
- Screen readers

Accessibility information forms part of resource metadata.

---

# Success Metrics

The Resource Management Service should improve:

- Resource discoverability
- Content reuse
- Teacher productivity
- Student engagement
- Storage efficiency
- Content quality

---

# Future Enhancements

Future capabilities may include:

- AI-powered semantic search
- Automatic curriculum mapping
- Video transcription
- OCR indexing
- Automatic language translation
- Intelligent content recommendations
- Digital watermarking
- Offline synchronization

---

# Guiding Principle

The Resource Management Service exists to ensure every educational resource is secure, discoverable, reusable, versioned, accessible, and available to the right users at the right time while respecting ownership, licensing, and institutional policies.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**