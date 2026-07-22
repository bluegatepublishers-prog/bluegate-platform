# SARTHI Marketplace Commerce Engine Engineering Specification

**Version:** 3.0

**Status:** Engineering Ready

**Module:** Marketplace Commerce Engine

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Marketplace Commerce Engine provides the transactional backbone of the SARTHI Marketplace.

It manages product catalogs, pricing, licensing, shopping carts, orders, fulfillment, revenue distribution, taxation, and commerce workflows while remaining independent of payment providers.

---

# Scope

The Marketplace Commerce Engine is responsible for:

- Product catalog
- Product variants
- Pricing
- Shopping cart
- Checkout
- Orders
- Fulfillment
- Licensing
- Revenue sharing
- Promotions
- Tax calculation
- Commerce analytics
- Audit logging

---

# Design Principles

The Commerce Engine shall be:

- Provider Neutral
- Secure
- Scalable
- Auditable
- Extensible
- Tenant Aware
- Event Driven
- Transaction Safe

---

# Architecture

```
Marketplace

↓

Commerce API

↓

Marketplace Commerce Engine

├── Product Catalog
├── Pricing Engine
├── Promotion Engine
├── Cart Manager
├── Checkout Service
├── Order Service
├── Fulfillment Service
├── License Manager
├── Revenue Distribution
├── Tax Engine
├── Analytics
└── Audit Logger

↓

Payment Engine
```

---

# Product Types

Support:

- Printed Books
- eBooks
- Worksheets
- Videos
- Courses
- Assessments
- Teacher Resources
- AI Content Packs
- Digital Licenses
- Institution Bundles
- Subscription Products

Product types remain configurable.

---

# Product Lifecycle

Draft

↓

Review

↓

Approved

↓

Published

↓

Available

↓

Suspended

↓

Archived

↓

Retired

---

# Product Structure

Each product contains:

- Product ID
- SKU
- Version
- Seller
- Tenant
- Category
- Title
- Description
- Images
- Price
- Currency
- License
- Availability
- Status

---

# Catalog

Support:

- Categories
- Collections
- Featured products
- Related products
- Bundles
- Product recommendations

Catalog supports multiple languages.

---

# Pricing Engine

Support:

- Fixed pricing
- Regional pricing
- Institutional pricing
- Subscription pricing
- Promotional pricing
- Volume discounts
- Time-limited offers

Pricing rules are version-controlled.

---

# Shopping Cart

Support:

- Guest carts (optional)
- Authenticated carts
- Saved carts
- Multi-item carts
- Multi-license carts

Cart validation occurs before checkout.

---

# Checkout

Validate:

- Product availability
- License eligibility
- Pricing
- Discounts
- Taxes
- User permissions

Checkout prepares payment but does not process it.

---

# Orders

Order lifecycle:

Pending

↓

Payment Authorized

↓

Confirmed

↓

Fulfillment

↓

Completed

↓

Archived

↓

Refunded (if applicable)

---

# Fulfillment

Support:

- Digital download
- License activation
- Physical shipment integration
- Subscription activation
- Institutional provisioning

Fulfillment type depends on product configuration.

---

# Licensing

Support:

- Individual license
- Classroom license
- School license
- District license
- Enterprise license
- Time-limited license
- Perpetual license

License rules integrate with the Licensing Engine.

---

# Revenue Distribution

Support:

- Platform commission
- Publisher revenue
- Creator revenue
- Affiliate revenue
- Tax deductions
- Settlement reports

Revenue rules are configurable.

---

# Promotions

Support:

- Coupons
- Voucher codes
- Campaign discounts
- Referral rewards
- Seasonal promotions
- Bundle discounts

Promotions are evaluated during checkout.

---

# Tax Engine

Support:

- GST
- VAT
- Sales Tax
- Tax exemptions
- Regional tax rules

Tax calculations are version-controlled.

---

# APIs

Examples:

GET /api/v1/products

POST /api/v1/cart/items

GET /api/v1/cart

POST /api/v1/checkout

GET /api/v1/orders/{id}

POST /api/v1/orders/{id}/cancel

---

# Security

Enforce:

- Tenant isolation
- Role permissions
- Secure checkout
- Price validation
- Audit logging

No commerce transaction bypasses validation.

---

# Audit Events

Generate events for:

- Product publication
- Price changes
- Cart updates
- Checkout
- Order creation
- Fulfillment
- License activation
- Refund
- Settlement

Audit records are immutable.

---

# Analytics

Track:

- Product views
- Conversion rate
- Cart abandonment
- Revenue
- Best-selling products
- License usage
- Seller performance
- Regional trends

---

# Performance

Support:

- Millions of products
- High-volume checkout
- Horizontal scaling
- Distributed catalogs
- High availability

---

# Acceptance Criteria

✓ Configurable catalog

✓ Versioned pricing

✓ Secure checkout

✓ Order lifecycle

✓ Fulfillment integration

✓ Revenue distribution

✓ Promotion engine

✓ Complete audit logging

---

# Future Enhancements

- Dynamic pricing
- AI-powered recommendations
- Marketplace auctions
- Group purchasing
- Institutional procurement workflows
- Cross-marketplace federation
- Carbon footprint reporting

---

# Guiding Principle

The Marketplace Commerce Engine provides a secure, flexible, and scalable commerce foundation that enables publishers, creators, institutions, and learners to exchange educational products and services transparently while maintaining accurate licensing, financial integrity, and auditability.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**