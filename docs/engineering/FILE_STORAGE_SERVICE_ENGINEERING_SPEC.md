# SARTHI File Storage Service Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** File Storage Service

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The File Storage Service provides a secure, scalable, provider-neutral platform for storing, retrieving, processing, and delivering files across the SARTHI ecosystem.

Applications never communicate directly with storage providers.

---

# Scope

The File Storage Service is responsible for:

- File uploads
- File downloads
- Object storage
- Versioning
- Metadata
- CDN delivery
- File validation
- Virus scanning
- Image processing
- Video streaming
- Access control
- Storage lifecycle
- Audit logging

---

# Supported File Types

The service supports:

- PDF
- DOCX
- PPTX
- XLSX
- EPUB
- HTML
- SCORM
- ZIP
- Images
- Audio
- Video
- SVG
- JSON
- CSV
- AI datasets
- Certificates

New formats should be supported through configuration.

---

# Storage Architecture

```
Application

↓

Storage API

↓

File Storage Service

├── Upload Manager

├── Validation Engine

├── Virus Scanner

├── Metadata Service

├── Image Processor

├── Video Processor

├── Thumbnail Generator

├── CDN Manager

├── Access Controller

└── Storage Provider

↓

Cloud Storage
```

---

# Provider Abstraction

Support:

- Amazon S3
- Azure Blob Storage
- Google Cloud Storage
- Cloudflare R2
- Vercel Blob
- Local Storage (Development)
- Future providers

Storage providers should be replaceable without application changes.

---

# Upload Workflow

User

↓

Permission Validation

↓

Upload Session

↓

Chunk Upload

↓

Validation

↓

Virus Scan

↓

Metadata Extraction

↓

Thumbnail Generation

↓

Storage

↓

CDN Publication

↓

Audit Event

---

# Download Workflow

Request

↓

Authentication

↓

Authorization

↓

License Validation

↓

Temporary URL

↓

CDN Delivery

↓

Audit Event

---

# File Metadata

Each object stores:

- File ID
- Original Name
- Internal Name
- MIME Type
- Extension
- Size
- Hash
- Owner
- Tenant
- Upload Time
- Version
- Status
- Storage Provider
- Storage Path
- CDN URL
- Thumbnail
- Preview
- Retention Policy

Metadata remains searchable.

---

# Object Lifecycle

Uploading

↓

Processing

↓

Available

↓

Updated

↓

Archived

↓

Deleted (Soft Delete)

↓

Permanent Removal

---

# Versioning

Support:

- Version history
- Current version
- Rollback
- Draft uploads
- Published versions
- Change tracking

Historical versions remain immutable.

---

# Image Processing

Automatically generate:

- Thumbnail
- Small
- Medium
- Large
- Web optimized
- Retina versions

Support modern image formats.

---

# Video Processing

Generate:

- Streaming versions
- Adaptive bitrate
- Thumbnails
- Captions
- Preview clips

---

# Preview Generation

Support previews for:

- PDF
- Office documents
- Images
- Videos
- eBooks

Preview generation occurs asynchronously.

---

# Chunked Uploads

Support:

- Resume uploads
- Large files
- Parallel uploads
- Integrity validation
- Retry

---

# File Validation

Validate:

- MIME type
- Extension
- Size
- Malware
- Hash
- Corruption

Invalid uploads are rejected.

---

# Virus Scanning

All uploads undergo scanning.

Detected threats:

- Quarantined
- Logged
- Administrators notified

Infected files never become publicly accessible.

---

# Access Control

Support:

- Public
- Authenticated
- Tenant
- Organization
- Classroom
- Owner
- Temporary links
- Signed URLs

Authorization is validated on every request.

---

# Retention Policies

Configurable policies include:

- Immediate deletion
- Soft delete
- Legal hold
- Archive after inactivity
- Automatic expiration

---

# CDN

Support:

- Global caching
- Cache invalidation
- Regional delivery
- Signed URLs
- Bandwidth optimization

---

# Storage Quotas

Track:

- User quota
- Organization quota
- Tenant quota
- Subscription quota

Uploads exceeding quota are rejected.

---

# APIs

Examples:

POST /api/v1/storage/upload

POST /api/v1/storage/chunk

POST /api/v1/storage/complete

GET /api/v1/storage/{id}

DELETE /api/v1/storage/{id}

GET /api/v1/storage/{id}/versions

POST /api/v1/storage/{id}/restore

---

# Security

Enforce:

- Encryption at rest
- Encryption in transit
- Signed URLs
- Permission validation
- Tenant isolation
- Audit logging

---

# Audit Events

Generate events for:

- Upload
- Download
- Preview
- Version restore
- Delete
- Archive
- Permission change
- Virus detection

Audit history is immutable.

---

# Performance

Support:

- Multi-GB uploads
- Millions of files
- Horizontal scaling
- CDN delivery
- High availability
- Low-latency retrieval

---

# Acceptance Criteria

✓ Provider abstraction

✓ Secure uploads

✓ Chunked upload support

✓ Automatic preview generation

✓ Image processing

✓ Video processing

✓ Virus scanning

✓ Version history

✓ CDN integration

✓ Complete audit logging

---

# Future Enhancements

- AI image tagging
- OCR extraction
- Automatic transcription
- Semantic indexing
- Duplicate detection
- Blockchain-backed integrity verification
- Cold storage tiering
- Intelligent lifecycle optimization

---

# Guiding Principle

Every file stored within SARTHI should be secure, discoverable, versioned, efficiently delivered, and protected throughout its lifecycle while remaining independent of any specific storage provider.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**