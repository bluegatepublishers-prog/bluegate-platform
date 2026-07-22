# SARTHI Inventory, Orders & Procurement Engineering Specification

**Version:** 5.0

**Status:** Engineering Ready

**Module:** Inventory, Orders & Procurement

**Product:** SARTHI

**Owner:** Edora Learning Pvt. Ltd.

---

# Purpose

The Inventory, Orders & Procurement platform provides end-to-end management of physical and digital goods across the SARTHI ecosystem.

It enables publishers, schools, universities, coaching institutes, distributors, warehouses, vendors, and institutional administrators to manage products, stock, purchase requests, procurement, orders, fulfilment, returns, and inventory analytics through a unified system.

The platform supports both educational commerce and internal institutional supply management.

---

# Scope

The platform is responsible for:

- Product catalog management
- Inventory management
- Warehouse management
- Vendor management
- Procurement
- Purchase requisitions
- Purchase orders
- Sales orders
- Institutional orders
- Publisher orders
- Order fulfilment
- Shipping and delivery
- Returns and replacements
- Stock reconciliation
- Inventory analytics

---

# Design Principles

The platform shall be:

- Multi-Tenant
- Multi-Warehouse
- Audit Ready
- Event Driven
- Configurable
- Scalable
- Commerce Ready
- Integration Friendly

---

# Architecture

```text
Inventory & Procurement Platform

├── Product Catalog
├── SKU Manager
├── Inventory Ledger
├── Warehouse Manager
├── Vendor Manager
├── Procurement Engine
├── Purchase Requisition Manager
├── Purchase Order Manager
├── Sales Order Manager
├── Fulfilment Engine
├── Shipping Manager
├── Returns Manager
├── Reconciliation Engine
├── Analytics
└── Audit
```

---

# Supported Goods

Support:

- Textbooks
- Workbooks
- Teacher guides
- Digital licenses
- Stationery
- School uniforms
- Laboratory equipment
- Sports equipment
- Computers and devices
- Furniture
- Library books
- Printing materials
- Certificates
- Identity cards
- Custom institutional supplies

New product categories may be added without architectural redesign.

---

# Product Catalog

Each product maintains:

- Product ID
- SKU
- Name
- Description
- Category
- Brand
- Publisher
- Vendor
- Unit of measure
- Tax classification
- Pricing
- Images
- Variants
- Dimensions
- Weight
- Status

Products may be physical, digital, bundled, or service-linked.

---

# Product Variants

Support variants based on:

- Size
- Colour
- Grade
- Subject
- Language
- Edition
- Format
- Packaging
- Institution
- Academic year

Each variant may maintain its own SKU and stock balance.

---

# Inventory Ledger

Maintain an immutable inventory ledger for:

- Stock received
- Stock issued
- Stock reserved
- Stock transferred
- Stock returned
- Stock damaged
- Stock adjusted
- Stock written off

Current stock is derived from verified ledger movements.

---

# Warehouse Management

Support:

- Central warehouses
- Regional warehouses
- Publisher warehouses
- Campus stores
- School stores
- Department stores
- Virtual warehouses
- Third-party fulfilment centers

Warehouse access is tenant and role controlled.

---

# Stock Status

Track:

- Available
- Reserved
- In transit
- Damaged
- Returned
- Quarantined
- Expired
- Written off

Status definitions remain configurable where appropriate.

---

# Stock Transfers

Support:

- Warehouse-to-warehouse transfer
- Campus-to-campus transfer
- Publisher-to-distributor transfer
- Institution-to-department issue
- Return-to-vendor transfer

Transfers require dispatch and receipt confirmation.

---

# Vendor Management

Maintain:

- Vendor identity
- Contact information
- Tax details
- Bank details
- Product categories
- Pricing agreements
- Service-level agreements
- Performance history
- Compliance documents
- Active or suspended status

Vendor access is limited to authorized information.

---

# Procurement Lifecycle

```text
Requirement Identified

↓

Purchase Requisition

↓

Budget Validation

↓

Approval

↓

Vendor Selection

↓

Quotation Comparison

↓

Purchase Order

↓

Goods Receipt

↓

Quality Inspection

↓

Invoice Matching

↓

Payment Authorization

↓

Closed
```

---

# Purchase Requisitions

Support:

- Department requests
- Campus requests
- Automatic reorder requests
- Emergency requests
- Bulk annual procurement
- Project-specific procurement

Approval workflows are configurable.

---

# Vendor Quotations

Support:

- Request for quotation
- Multiple vendor responses
- Price comparison
- Delivery comparison
- Quality evaluation
- Negotiation records
- Final selection

Selection decisions remain auditable.

---

# Purchase Orders

Each purchase order includes:

- Purchase order number
- Vendor
- Products
- Quantities
- Rates
- Taxes
- Discounts
- Delivery terms
- Payment terms
- Expected delivery date
- Approval history
- Status

Issued purchase orders remain immutable except through controlled amendments.

---

# Goods Receipt

Record:

- Received quantity
- Rejected quantity
- Damaged quantity
- Batch or lot number
- Serial number
- Expiry date
- Warehouse location
- Inspection result
- Receiving officer

Partial receipt is supported.

---

# Three-Way Matching

Validate:

- Purchase order
- Goods receipt
- Vendor invoice

Discrepancies require review before payment authorization.

---

# Sales & Institutional Orders

Support:

- School book orders
- Distributor orders
- Student orders
- Parent orders
- Publisher orders
- Internal department orders
- Marketplace orders
- Bulk institutional orders

Orders integrate with the Marketplace, Payment, Finance, and Licensing engines.

---

# Order Lifecycle

```text
Draft

↓

Submitted

↓

Validated

↓

Approved

↓

Payment Pending or Credit Approved

↓

Stock Reserved

↓

Packed

↓

Dispatched

↓

Delivered

↓

Completed
```

Alternative states include:

- Cancelled
- Partially fulfilled
- Returned
- Refunded
- Failed

---

# Stock Reservation

Stock may be reserved for:

- Confirmed orders
- Approved institutional requests
- Distributor allocations
- Pre-orders
- Bundled academic packages

Reservations expire according to configurable policies.

---

# Fulfilment

Support:

- Single warehouse fulfilment
- Split fulfilment
- Partial fulfilment
- Drop shipping
- Publisher fulfilment
- Third-party logistics
- Campus pickup
- Digital delivery

Fulfilment events are tracked individually.

---

# Packing

Support:

- Packing lists
- Box labels
- Product verification
- Weight validation
- Package dimensions
- Batch assignment
- Dispatch readiness

Packing mistakes should be detectable before dispatch.

---

# Shipping & Delivery

Integrate with:

- Courier providers
- Postal services
- Institutional transport
- Third-party logistics
- Local delivery partners

Track:

- Shipment number
- Tracking number
- Carrier
- Dispatch date
- Estimated delivery
- Delivery status
- Proof of delivery

---

# Returns & Replacements

Support:

- Full returns
- Partial returns
- Damaged product returns
- Incorrect item returns
- Replacement requests
- Publisher recalls
- Vendor returns
- Credit notes
- Refunds

Return eligibility follows configurable policies.

---

# Digital Goods

Support:

- Digital book licenses
- Subscription access
- Download entitlements
- Access codes
- Institution licenses
- Seat-based licenses

Digital fulfilment integrates with the Licensing Engine.

---

# Reorder Management

Support:

- Minimum stock levels
- Maximum stock levels
- Reorder points
- Safety stock
- Lead time
- Seasonal demand
- Academic-year demand
- Automatic purchase requisitions

Recommendations require approval before procurement.

---

# Inventory Reconciliation

Support:

- Cycle counts
- Annual stock audits
- Blind counts
- Variance reporting
- Adjustment approvals
- Warehouse reconciliation
- Serial-number reconciliation

Every adjustment requires a reason.

---

# Batch & Serial Tracking

Support:

- Batch numbers
- Lot numbers
- Serial numbers
- Manufacturing dates
- Expiry dates
- Warranty dates
- Product recalls

Tracking requirements depend on product type.

---

# Budget Integration

Procurement may validate against:

- Department budgets
- Campus budgets
- Project budgets
- Annual procurement plans
- Grant allocations
- Restricted funds

Budget validation integrates with Finance & Fee Management.

---

# Notifications

Notify stakeholders when:

- Requisition requires approval
- Purchase order is issued
- Stock is low
- Goods are received
- Order is dispatched
- Delivery fails
- Return is approved
- Vendor performance declines

Channels are configurable.

---

# AI Inventory & Procurement Assistant

Provide AI-assisted:

- Demand forecasting
- Reorder recommendations
- Vendor comparison
- Procurement anomaly detection
- Dead-stock identification
- Stockout risk prediction
- Delivery-delay prediction
- Purchase planning

AI outputs are advisory and require authorized review.

---

# APIs

Examples:

```http
GET /api/v1/inventory/products

POST /api/v1/inventory/products

GET /api/v1/inventory/stock

POST /api/v1/procurement/requisitions

POST /api/v1/procurement/purchase-orders

POST /api/v1/orders

GET /api/v1/orders/{id}

POST /api/v1/returns
```

---

# Events

Publish events including:

- ProductCreated
- StockReceived
- StockReserved
- StockTransferred
- StockAdjusted
- PurchaseRequisitionSubmitted
- PurchaseOrderIssued
- GoodsReceived
- OrderConfirmed
- OrderDispatched
- OrderDelivered
- ReturnApproved

Events integrate with the SARTHI Event Bus.

---

# Security

Enforce:

- Tenant isolation
- Warehouse-level permissions
- Procurement role separation
- Approval limits
- Sensitive vendor-data protection
- Secure financial integration
- Audit logging

Users must not approve their own restricted procurement actions where segregation of duties applies.

---

# Audit Events

Generate audit records for:

- Product created
- Stock adjusted
- Requisition approved
- Vendor selected
- Purchase order issued
- Goods receipt recorded
- Order cancelled
- Return approved
- Inventory written off
- Vendor suspended

Audit records are immutable.

---

# Analytics

Track:

- Inventory turnover
- Stockout frequency
- Overstock value
- Dead stock
- Order fulfilment time
- Procurement cycle time
- Vendor performance
- Return rate
- Warehouse accuracy
- Demand forecast accuracy
- Purchase price variance
- Delivery performance

---

# Performance

Support:

- Millions of products and variants
- Millions of inventory movements
- High-volume order processing
- Multi-warehouse operations
- Concurrent stock reservations
- Horizontal scaling
- High availability

Inventory updates must protect against overselling and race conditions.

---

# Data Integrity

Enforce:

- Idempotent inventory movements
- Atomic stock reservations
- Unique transaction references
- Optimistic or pessimistic concurrency controls
- Duplicate receipt prevention
- Duplicate fulfilment prevention
- Ledger-based reconciliation

Inventory balances must never be changed without a corresponding ledger event.

---

# Acceptance Criteria

✓ Product and SKU management

✓ Multi-warehouse inventory

✓ Immutable inventory ledger

✓ Vendor management

✓ Purchase requisitions

✓ Purchase orders

✓ Goods receipt and inspection

✓ Order fulfilment

✓ Returns and replacements

✓ Reconciliation and analytics

✓ AI-assisted forecasting

✓ Complete audit logging

---

# Future Enhancements

- Barcode and QR scanning
- RFID warehouse automation
- Robotic fulfilment integration
- Computer-vision stock counting
- Dynamic vendor bidding
- Predictive procurement planning
- Sustainable procurement scoring
- Reverse logistics optimization
- Distributor network management
- Print-on-demand integration

---

# Guiding Principle

Inventory and procurement within SARTHI should provide complete visibility from demand to purchase, stock, fulfilment, delivery, and return. Every item, order, approval, and inventory movement must remain accurate, traceable, tenant-isolated, and operationally transparent.

---

**End of Document**

**© Edora Learning Pvt. Ltd.**