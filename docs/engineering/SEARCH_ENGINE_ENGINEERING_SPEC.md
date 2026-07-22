# SARTHI Search Engine Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Search Engine

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Search Engine provides a centralized search platform for all SARTHI modules.

Every searchable entity should be indexed through this service rather than implementing module-specific search solutions.

---

# Scope

The Search Engine is responsible for:

- Full-text search
- Semantic search
- Faceted search
- Autocomplete
- Suggestions
- Filtering
- Ranking
- Indexing
- Search analytics
- Permission-aware search

---

# Supported Search Domains

Search supports:

- Users
- Organizations
- Books
- Chapters
- Resources
- Videos
- Assessments
- Questions
- Courses
- Classes
- Schools
- Universities
- Coaching Institutes
- Marketplace Products
- AI Knowledge
- Documents
- Notifications
- Reports

---

# Search Architecture

```
Applications

↓

Search API

↓

Search Engine

├── Query Parser

├── Ranking Engine

├── Permission Filter

├── Index Manager

├── Semantic Search

├── Autocomplete

├── Spell Correction

├── Synonym Engine

├── Analytics

└── Search Provider

↓

Search Backend
```

---

# Search Types

Support:

- Keyword Search
- Full-text Search
- Exact Match
- Prefix Search
- Wildcard Search
- Fuzzy Search
- Semantic Search
- Vector Search (future)
- Hybrid Search

---

# Indexing

Every searchable object includes:

- Identifier
- Tenant
- Owner
- Title
- Description
- Keywords
- Metadata
- Tags
- Categories
- Permissions
- Updated Time

Indexes should update asynchronously.

---

# Index Sources

The engine indexes:

- Identity
- Resources
- Books
- Assessments
- Question Bank
- Marketplace
- AI Knowledge
- Analytics Metadata
- Notifications
- Files

---

# Search Workflow

User

↓

Permission Validation

↓

Query Parsing

↓

Query Expansion

↓

Index Search

↓

Ranking

↓

Permission Filter

↓

Result Formatting

↓

Analytics

↓

Response

---

# Query Features

Support:

- Boolean operators
- Phrase search
- Wildcards
- Filters
- Sorting
- Pagination
- Highlighting
- Field-specific search

---

# Faceted Search

Filter by:

- Subject
- Class
- Language
- Board
- Curriculum
- Institution
- Resource Type
- Date
- Author
- Publisher
- Category
- Tags

---

# Autocomplete

Provide:

- Search suggestions
- Recent searches
- Trending searches
- Institution-specific suggestions

Suggestions respect permissions.

---

# Spell Correction

Support:

- Typo correction
- Did-you-mean
- Synonym expansion
- Acronym matching

---

# Semantic Search

Support:

- Meaning-based retrieval
- Context-aware ranking
- AI knowledge retrieval
- Curriculum-aware matching

Semantic search complements keyword search.

---

# Permission Filtering

Search results must respect:

- Tenant isolation
- Role permissions
- Ownership
- Licensing
- Publication status

Unauthorized records are never returned.

---

# Ranking

Ranking considers:

- Relevance
- Popularity
- Freshness
- User role
- Institution
- Learning context
- Personalization

Ranking algorithms should be configurable.

---

# Search Analytics

Track:

- Popular searches
- Failed searches
- Click-through rate
- Average response time
- Trending topics
- User behavior
- Search refinement

---

# APIs

Examples:

GET /api/v1/search

GET /api/v1/search/suggestions

GET /api/v1/search/trending

POST /api/v1/search/index

DELETE /api/v1/search/index/{id}

---

# Security

Enforce:

- Tenant isolation
- Permission-aware indexing
- Secure queries
- Rate limiting
- Audit logging

---

# Audit Events

Generate events for:

- Index creation
- Index updates
- Search execution
- Index deletion
- Search configuration changes

---

# Performance

Support:

- Millions of indexed documents
- Sub-second response times
- Distributed indexes
- Incremental indexing
- Horizontal scaling

---

# Acceptance Criteria

✓ Unified platform search

✓ Full-text search

✓ Semantic search support

✓ Permission-aware results

✓ Autocomplete

✓ Faceted filtering

✓ Search analytics

✓ Complete audit logging

---

# Future Enhancements

- Voice search
- Image search
- OCR search
- Cross-language search
- Personalized ranking
- AI-generated search summaries
- Graph-based search
- Federated search across external systems

---

# Guiding Principle

Search should enable every authorized user to discover the right information quickly, accurately, and securely while respecting permissions, institutional boundaries, and educational context.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**