# SARTHI RAG Knowledge Service Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** RAG Knowledge Service

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The RAG Knowledge Service provides secure, permission-aware retrieval of educational knowledge for every AI capability within the SARTHI platform.

Rather than allowing AI models to answer from model memory alone, every response should be grounded using trusted institutional and educational content whenever appropriate.

---

# Scope

The RAG Knowledge Service is responsible for:

- Knowledge ingestion
- Document processing
- Chunking
- Embedding generation
- Vector indexing
- Hybrid retrieval
- Context ranking
- Citation generation
- Permission-aware retrieval
- Knowledge versioning

---

# Design Principles

The service shall be:

- Grounded
- Explainable
- Permission-aware
- Tenant-isolated
- Versioned
- Auditable
- Provider-neutral
- Scalable

---

# Architecture

```
Applications

↓

AI Gateway

↓

Knowledge Service

├── Document Ingestion
├── Document Parser
├── OCR Engine
├── Chunking Engine
├── Metadata Extractor
├── Embedding Generator
├── Vector Store
├── Hybrid Search
├── Context Ranker
├── Citation Generator
├── Permission Filter
└── Analytics

↓

Knowledge Repository
```

---

# Knowledge Sources

The service retrieves from:

- Books
- Chapters
- Lesson Plans
- Worksheets
- Assessments
- Question Bank
- Teacher Guides
- Publisher Content
- Policies
- School Documents
- University Documents
- Marketplace Content
- AI Knowledge Collections

New knowledge sources are pluggable.

---

# Document Ingestion

Support:

- PDF
- DOCX
- PPTX
- HTML
- EPUB
- Markdown
- Images (OCR)
- Video transcripts
- Audio transcripts
- Structured JSON

---

# Processing Pipeline

Document

↓

Validation

↓

OCR (if required)

↓

Metadata Extraction

↓

Chunking

↓

Embedding Generation

↓

Vector Indexing

↓

Availability

---

# Chunking

Support:

- Fixed-size chunks
- Semantic chunks
- Chapter-based chunks
- Heading-aware chunks
- Curriculum-aware chunks

Chunk strategy is configurable.

---

# Metadata

Each chunk stores:

- Document ID
- Chunk ID
- Source
- Tenant
- Subject
- Grade
- Curriculum
- Chapter
- Language
- Version
- Author
- Permissions

Metadata participates in retrieval.

---

# Embeddings

Support:

- Provider-neutral embedding models
- Versioned embeddings
- Re-indexing
- Incremental updates

Embedding providers remain replaceable.

---

# Retrieval

Retrieval supports:

- Keyword search
- Semantic search
- Hybrid search
- Metadata filtering
- Curriculum filtering
- Tenant filtering
- Permission filtering

---

# Context Ranking

Ranking considers:

- Semantic relevance
- Curriculum alignment
- Source quality
- Publication status
- Freshness
- User role
- Institution context

---

# Citation Generation

Every AI response may include:

- Source document
- Chapter
- Section
- Page (when available)
- Resource identifier

Applications determine citation display.

---

# Permission Model

Knowledge retrieval respects:

- Tenant isolation
- Resource permissions
- Licensing
- Publication status
- User role
- Organization membership

Unauthorized knowledge is never retrieved.

---

# Knowledge Collections

Collections may represent:

- Curriculum
- Institution
- Publisher
- Subject
- Language
- Course
- Marketplace package

Collections are independently managed.

---

# Re-indexing

Support:

- Full rebuild
- Incremental indexing
- Scheduled indexing
- Event-driven indexing

---

# APIs

Examples:

POST /api/v1/knowledge/index

POST /api/v1/knowledge/query

GET /api/v1/knowledge/{id}

POST /api/v1/knowledge/reindex

GET /api/v1/knowledge/collections

---

# Security

Enforce:

- Tenant isolation
- Encryption
- Permission filtering
- Audit logging
- Rate limiting

---

# Audit Events

Generate events for:

- Document ingestion
- Index creation
- Re-indexing
- Retrieval execution
- Collection updates
- Permission changes

---

# Analytics

Track:

- Retrieval accuracy
- Citation usage
- Search latency
- Collection size
- Retrieval frequency
- Knowledge freshness
- Failed retrievals

---

# Performance

Support:

- Millions of indexed chunks
- Sub-second retrieval
- Horizontal scaling
- Distributed vector storage
- Incremental indexing

---

# Acceptance Criteria

✓ Permission-aware retrieval

✓ Hybrid search

✓ Citation generation

✓ Knowledge versioning

✓ Incremental indexing

✓ Provider-neutral embeddings

✓ Complete audit logging

---

# Future Enhancements

- Knowledge graph integration
- Cross-document reasoning
- Multimodal retrieval
- Personalized retrieval ranking
- Automatic curriculum alignment
- Real-time collaborative knowledge collections

---

# Guiding Principle

Every AI response in SARTHI should be grounded in trusted, current, and authorized knowledge, ensuring educational accuracy, transparency, and institutional trust while preserving security and tenant isolation.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**