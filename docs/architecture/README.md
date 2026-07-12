# Bluegate Platform OS Architecture

> **Every future Codex implementation task must first read `BLUEGATE_PLATFORM_OS_ARCHITECTURE_V1.md` and `PLATFORM_DECISION_LOG.md`.**

This directory is the governing architecture reference for Bluegate Platform OS.

| Document | Purpose |
|---|---|
| `BLUEGATE_PLATFORM_OS_ARCHITECTURE_V1.md` | Approved baseline, current-state evidence, target design, standards, and glossary |
| `PLATFORM_DECISION_LOG.md` | Durable architecture decisions and their consequences |
| `ROLE_PERMISSION_MATRIX.md` | Target role boundaries and sensitive-access notes |
| `IMPLEMENTATION_ROADMAP.md` | Ordered delivery phases, dependencies, controls, and exit criteria |
| `DATA_OWNERSHIP_AND_TENANCY.md` | Model-by-model ownership, retention, indexing, and migration guidance |
| `README.md` | Reading order and change process |

## Change control

Architecture changes require business and technical approval, an entry or amendment in the decision log, and a version update to affected documents. Editorial clarifications increment the patch version; compatible additions increment the minor version; changed governing principles or incompatible ownership rules increment the major version. Never rewrite an accepted decision without preserving its history and review reason.

For implementation work, read the master document and decision log first, then the permission, ownership, and roadmap document relevant to the change. Proposed behavior must be labeled until implemented and verified.
