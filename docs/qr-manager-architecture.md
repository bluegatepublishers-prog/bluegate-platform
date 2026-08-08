# Edora Dynamic QR Manager architecture

## Purpose

QR Manager is the Publisher Admin workspace for permanent dynamic QR identifiers used in printed books. It is intentionally separate from Content Studio, which authors digital learning content.

Internally, this capability belongs to **Edora Dynamic QR**. Bluegate is the current publisher tenant; the architecture must support additional publishers without changing the QR domain model.

## Why QR is separate from Content Studio

Content Studio authors text, images, video, tables, educational blocks, activities, worksheets, and exercises. A printed QR code is not a chapter, module, content-document block, educational object, or digital resource. Printed placement is owned by the book-production/design workflow outside Content Studio.

QR creation must not require a module, chapter content, digital book content, resource, video, worksheet, or published content. A QR may exist for months before any digital learning material is available.

## Print-first workflow

1. Generate a permanent dynamic QR.
2. Place the QR in the print design in InDesign, Corel, or PDF production.
3. Print and distribute the book.
4. Create digital resources later and attach them to the existing QR.

The intended permanent public resolver format is:

`https://edoralearning.in/q/{code}`

Example: `https://edoralearning.in/q/X7K92A`

This document defines the intended format only. Domain, DNS, and resolver implementation are outside this boundary task.

## Ownership and multi-tenant model

The conceptual ownership chain is:

```text
Edora
  -> QR technology/service
    -> Publisher Admin tenant
      -> Publisher
        -> Book
          -> Print edition
            -> QR code
```

QR records must remain publisher-scoped. Do not hard-code Bluegate as the only publisher or put Bluegate URLs, R2 URLs, resource IDs, or video URLs into printed QR architecture.

## QR is not a resource

A resource is a digital content asset such as `VIDEO`, `IMAGE`, `PDF`, `WORKSHEET`, `MIND_MAP`, or `ANIMATION`. A QR is a permanent print-book resolver that may later point to or present multiple resources. QR must not be introduced as a `ResourceType`.

## Empty QR state and future attachments

QR creation must allow `attachedResourceCount = 0`. The initial conceptual state is `EMPTY`; later lifecycle states include `LIVE` and `DISABLED`.

- `EMPTY`: the permanent QR exists and may already be printed, but no resource is attached.
- `LIVE`: the QR is available according to future resolver rules.
- `DISABLED`: the QR remains retained but is no longer active.

A future QR may have zero or many ordered attachments. Attachments may reference supported platform resources or other approved targets. QR creation must never force a resource relation.

## Edition model

QR codes belong to a print edition, not merely to a book or a digital chapter. Page references and QR sets may differ between editions:

```text
Science Explorer 6
  2027 Edition
    QR-001
    QR-002
  2028 Edition
    QR-101
    QR-102
```

The future conceptual model is `Publisher -> Book -> QrBookEdition -> QrCode -> 0..many QrAttachment`.

A future `QrCode` may include `id`, `publisherId`, `bookId`, `editionId`, `code`, `label`, `pageNumber`, `internalNote`, `status`, and timestamps. A future `QrAttachment` may include `qrCodeId`, a resource or supported target reference, `label`, `order`, and `active`.

No Prisma model or migration is added by this boundary task.

## Permanence rule

Once a QR has been generated for potential printing, it must never be hard-deleted or reused for another purpose. Future lifecycle actions are disable, archive, and change attached resources. They are not hard delete and reuse, because printed books may remain in circulation for years.

## Future implementation phases

1. Finalize edition-aware data model and migration with publisher scoping.
2. Generate permanent codes and validate the `edoralearning.in/q/{code}` resolver contract.
3. Add QR image assets, print export, bulk generation, and edition workflows.
4. Add resource attachment management without making attachments mandatory.
5. Add the public resolver and learner-facing resource presentation.
6. Add scanning analytics, reporting, and operational controls.

The following are deliberately out of scope for this boundary phase: QR image/SVG/PNG generation, bulk generation, scanning analytics, resource attachment UI, mobile landing pages, redirects, custom domains, external URL attachments, reporting, Prisma migrations, and database model changes.