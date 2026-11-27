# RepleniQ™ — Intelligent Store Operations & Autonomous Stock Rebalance OS

<div align="center">

![RepleniQ Banner](https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80)

**Powered by RustyStick Technologies LLP**  
*Next-generation multi-store inventory optimization, peer-to-peer stock rebalancing, and autonomous replenishment engine.*

</div>

---

## 📋 Table of Contents

- [Executive Overview & Business Value](#-executive-overview--business-value)
- [Quick Start Guide (Zero Database Setup)](#-quick-start-guide-zero-database-setup)
- [Client Pitch & Demo Presentation Guide](#-client-pitch--demo-presentation-guide)
- [Role-Based Access & Demo Personas](#-role-based-access--demo-personas)
- [Architecture & Storage Mechanism](#-architecture--storage-mechanism)
- [Feature Walkthrough & User Manual](#-feature-walkthrough--user-manual)
  - [1. Executive Operations & Supply Chain Command Center](#1-executive-operations--supply-chain-command-center)
  - [2. Store Manager Dashboard & POS Simulation](#2-store-manager-dashboard--pos-simulation)
  - [3. Action Center — AI Autonomous & Manual Rebalancing](#3-action-center--ai-autonomous--manual-rebalancing)
  - [4. Stock Transfer Consignments & Inward Dock](#4-stock-transfer-consignments--inward-dock)
  - [5. Master Product Catalog & Pricing Tiers](#5-master-product-catalog--pricing-tiers)
  - [6. Multi-Store Network Directory](#6-multi-store-network-directory)
  - [7. Operational Reports & Analytics](#7-operational-reports--analytics)
  - [8. System Configurations & Operational Waves](#8-system-configurations--operational-waves)
  - [9. Enterprise Audit Logs](#9-enterprise-audit-logs)
- [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 💼 Executive Overview & Business Value

In high-velocity hypermarket networks (such as **D-Mart**, **JioMart**, and **Reliance Retail**), traditional central distribution warehouse replenishment suffers from **36-72 hour transit lead times**. When a sudden demand spike occurs at a store, shelves stock out, causing direct revenue loss, while a store only 15 km away may be sitting on 45 days of excess inventory for the exact same SKU.

**RetailHub Enterprise** solves this multi-crore retail challenge by providing:

1. **Intra-Region Peer-to-Peer Rebalancing**: Shifts excess inventory directly between neighboring stores within a 4-8 hour logistics window, avoiding central warehouse bottlenecks.
2. **Autonomous Stockout Prevention**: A heuristic AI engine continuously monitors Days of Inventory (DOI) and Average Daily Sales (ADS) across all store-SKU combinations and automatically drafts optimized transfer recommendations before a stockout occurs.
3. **Store-Initiated Rebalance Requests**: Empowers local Store Managers to request rapid stock transfers when local demand surges (festivals, promotions, weekend rush) are detected on the ground.
4. **End-to-End Transfer Governance**: Full shipment tracking from consignment dispatch to inward dock scanning and Goods Received Note (GRN) inventory deposition.
5. **Zero-Friction Client Demo Mode**: Ships with an in-memory & browser `localStorage` mock database that requires **zero external databases** (PostgreSQL/Redis) to run a 100% interactive enterprise pitch.

---

## 🚀 Quick Start Guide (Zero Database Setup)

The application is engineered to run immediately out-of-the-box with **no database setup, no Docker, and no migration scripts required**.

### Prerequisites
- **Node.js**: Version 18.x or 20.x+
- **npm**: Version 9.x or 10.x+

### 1. Installation
Clone or extract the repository and install dependencies:
```bash
npm install
```

### 2. Launch the Application
Start the development server:
```bash
npm run dev
```
> **What this does:** Concurrently boots the Vite client on `http://localhost:5173` and the Express background support service on `http://localhost:5000`.

### 3. Open in Browser
Navigate to:
```
http://localhost:5173
```
- **Automatic Seed Data**: The application automatically seeds a comprehensive enterprise dataset (500+ SKUs, 50 retail stores across multiple states, active stock transfers, inventory balances, sales transactions, and audit logs) directly into your browser's `localStorage` on first load.
- **No Database Needed**: All CRUD operations (creating products, submitting transfer requests, approving recommendations, modifying rules, adjusting stock) execute and persist seamlessly in the browser.

---

## 🎯 Client Pitch & Demo Presentation Guide

When pitching RetailHub Enterprise to leadership, investors, or retail clients, follow this **5-minute winning presentation flow**:

```
[1. Login as VP Operations] ➔ [2. Highlight Executive Command Center] 
       ↓
[3. Switch to Store Manager] ➔ [4. Trigger POS Checkout & Stockout]
       ↓
[5. View Autonomous AI Recommendation] ➔ [6. Switch to Regional Manager & Approve Transfer]
       ↓
[7. Receive Transfer at Store Inward Dock] ➔ [8. Verify Audit Trail & Reports]
```

### Step-by-Step Demo Script:

1. **The Executive Pitch (Vikram Aditya / VP Operations)**:
   - Log in using the **Vikram Aditya** 1-Click login card.
   - Point out the **Health Distribution** chart: *Healthy* vs *Low* vs *Critical* vs *Excess* stock across the store network.
   - Show how the system surfaces **Top At-Risk Stores** before stockouts happen.

2. **The Store Floor Problem (Rajesh Sharma / Store Manager)**:
   - Click the profile avatar at top-right, log out, and log in as **Rajesh Sharma (Store Manager - Bhopal Hypermarket)**.
   - Navigate to **Sales Operations** (`/operations/sales`) and simulate a rapid checkout of 20 units of an essential SKU (e.g. Britannia Detergents).
   - Notice shelf stock drops below the safety floor (< 7.0 days of inventory).

3. **The Autonomous AI Engine (Action Center)**:
   - Navigate to **Action Center** (`/intelligence/action-center`).
   - Show the newly generated **HIGH Priority Rebalance Recommendation**:
     - Notice the **AI Reasoning Engine** briefing explaining why this transfer was recommended.
     - Show the donor store selection (e.g., *Indore Supermarket* located 185 km away with 38 days excess cover).

4. **The Regional Manager Approval (Priya Nair / Regional Manager)**:
   - Log in as **Priya Nair (Regional Manager - Central MP Corridor)**.
   - Review the recommendation in the Action Center.
   - Click **Approve**. The system automatically creates a formal Stock Transfer consignment, decreases source inventory, and logs an immutable audit trail.

5. **Inward Receiving & GRN Verification (Store Inward Dock)**:
   - Switch back to Store Manager, go to **Stock Transfers** (`/operations/transfers`).
   - Find the transfer under **Incoming Shipments (In-Transit)**.
   - Click **Receive & Inward**. The stock is instantly credited to Bhopal Hypermarket's shelf availability, resolving the stockout!

6. **Resetting for the Next Demo**:
   - Click the **Reset Demo Data** button in the top navigation bar at any time to instantly restore the pristine baseline dataset.

---

## 👥 Role-Based Access & Demo Personas

The login screen includes dedicated **1-Click Demo Login Cards** for all 4 enterprise personas:

| Persona Name | Role Authority | Operational Scope | Typical Use Cases |
| :--- | :--- | :--- | :--- |
| **Ananya Deshmukh** | `ADMIN` | Enterprise Platform (Full Access) | Catalog management, user provisioning, scheduler timings, and audit compliance. |
| **Vikram Aditya** | `EXECUTIVE` | VP Retail Operations (HQ) | Financial performance, macro inventory health distribution, network margins. |
| **Priya Nair** | `REGIONAL_MANAGER` | Central MP Corridor Region | Approving transfer requests, reviewing regional store health, logistics compliance. |
| **Rajesh Sharma** | `STORE_MANAGER` | Bhopal Hypermarket (BHP-001) | Daily shelf replenishment, store stock rebalance requests, inward shipment receipt. |

> **Default Password** for manual credential sign-in: `RetailHub@2026`

---

## 🏗️ Architecture & Storage Mechanism

RetailHub Enterprise employs a resilient **Hybrid Client-Adapter Architecture**:

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   (Tailwind CSS v4 + TanStack Query + React Router v6) │
└───────────────────────────┬────────────────────────────┘
                            │
               Axios HTTP Interceptor Layer
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
   [Client Mock Adapter]          [Express REST API]
   (mockApiAdapter.ts)            (server/index.ts)
             │                             │
             ▼                             ▼
    Browser localStorage           Prisma ORM + PostgreSQL
    (Instant Demo Mode)            (Production Mode)
```

- **Offline-First Mock Adapter (`src/mock/mockApiAdapter.ts`)**:
  - Automatically intercepts all frontend API calls (`/products`, `/stores`, `/inventory`, `/transfers`, `/recommendations`, `/sales`, `/audit-logs`).
  - Persists full state mutations (creates, updates, status changes, deletions) directly into `localStorage`.
  - Ensures changes remain persisted even after browser refreshes.
- **Auto-Seeding (`src/mock/mockDatabase.ts`)**:
  - Automatically loads realistic enterprise seed data on first visit.
  - Can be reset at any time using the **Reset Demo Data** button.

---

## 📖 Feature Walkthrough & User Manual

### 1. Executive Operations & Supply Chain Command Center
- **Route**: `/dashboard/executive`
- **Key Metrics**:
  - **Total 30-Day Network Revenue**: Aggregated top-line revenue across all retail stores with rolling month-over-month growth.
  - **Active Network SKUs**: Real-time count of active sellable items in the catalog.
  - **Stock Health Index**: Percentage of store-SKU inventory holding healthy Days of Inventory (7-30 days).
  - **Active Inter-Store Shipments**: Number of transfer consignments currently in transit between stores.
- **Dynamic Scope Filters**: Filter by Operational Region, Store Format, and Date Range. All KPI cards, charts, and tables dynamically re-aggregate.

### 2. Store Manager Dashboard & POS Simulation
- **Route**: `/dashboard/store` and `/operations/sales`
- **Daily Operational View**:
  - Today's Sales & Footfall counter.
  - On-shelf Availability Rate (SLA target > 96.5%).
  - Inward consignments arriving today.
- **POS Simulation Engine**:
  - Test store checkout workflows by selecting any SKU and quantity.
  - Real-time stock decrement with automatic threshold validation.

### 3. Action Center — AI Autonomous & Manual Rebalancing
- **Route**: `/intelligence/action-center`
- **How Recommendations Are Generated**:
  1. **Autonomous Wave Sweeps**: The background scheduling engine evaluates every Store-SKU pair. If `Available Stock / Rolling ADS < Safety Floor (7 days)`, a rebalance alert is flagged.
  2. **Donor Store Ranking**: Evaluates peer stores within the same region holding excess inventory (`DOI > 21 days`). Ranks donors based on proximity (distance in km) and available surplus.
  3. **Manual Store Requests**: Store Managers click **Request Store Stock Rebalance** to request stock directly from peer stores with custom reason tags (festival surge, promotional display).
- **Review & Actions**:
  - **Approve**: Immediately drafts a formal Stock Transfer consignment.
  - **Modify**: Adjust transfer quantity or assign an alternate donor store.
  - **Reject**: Dismiss recommendation with documented operational rationale.

### 4. Stock Transfer Consignments & Inward Dock
- **Route**: `/operations/transfers`
- **Consignment Lifecycle**:
  - `APPROVED` ➔ `DISPATCHED` ➔ `IN_TRANSIT` ➔ `RECEIVED`
- **Features**:
  - View Carrier Name, Vehicle Number, and Estimated Time of Arrival (ETA).
  - One-click **Receive & Inward**: Deposits stock into destination store inventory.
  - **Print / PDF Dispatch Slips**: Generates printable Goods Transfer Notes with barcode tracking.

### 5. Master Product Catalog & Pricing Tiers
- **Route**: `/operations/products`
- **Capabilities**:
  - Filter by SKU Code, Barcode, Brand, Category, and Velocity Tier.
  - View cost price, selling price, and Maximum Retail Price (MRP) margins.
  - **New Product Modal**: Add custom SKUs to the live catalog.
  - **Batch CSV Import**: Ingest new product sheets in bulk.

### 6. Multi-Store Network Directory
- **Route**: `/operations/stores`
- **Features**:
  - Comprehensive store directory covering Hypermarkets, Supermarkets, and Express convenience stores.
  - Geocoded coordinates (Latitude/Longitude) for accurate logistics route optimization.

### 7. Operational Reports & Analytics
- **Route**: `/reports`
- **Pre-Configured Reports**:
  - **SKU Performance Report**: Fast-moving vs Dead-stock velocity classification.
  - **Store Performance Comparison**: Gross margin and stockout frequency per store.
  - **Stock Transfer & Rebalance Report**: Logistics SLA compliance and units transferred.
  - **Inventory Valuation Report**: Total capital tied up in shelf and warehouse stock.
- **Exporting**: Instant export to **CSV** or **Printable PDF**.

### 8. System Configurations & Operational Waves
- **Route**: `/admin/configurations`
- **Inventory Replenishment Policies**:
  - Safety Floor Days (default: 7.0 days).
  - Target Reorder Cover (default: 14.0 days).
  - Maximum Holding Ceiling (default: 30.0 days).
- **Auto-Scan Timing & Schedule**:
  - Configurable operational sweep wave times (e.g. 02:00, 06:00, 14:00, 22:00).
  - Live sandbox controls to trigger on-demand sweeps or test simulated stockouts.

### 9. Enterprise Audit Logs
- **Route**: `/admin/audit-logs`
- **Compliance & Governance**:
  - Immutable timeline capturing User ID, IP address, Action, Target Entity, and Old vs New JSON values.
  - Covers every authorization, price adjustment, inventory override, and system scan.

---

## 🔒 Date Range Filtering Standard

Across all modules (Audit Logs, Transfers, Sales, Reports, and Executive Dashboards), date filtering enforces strict validation:
- **`Start Date <= End Date`**:
  - When opening the Start Date picker, all dates after the currently selected End Date are visually disabled and unclickable.
  - When opening the End Date picker, all dates before the currently selected Start Date are visually disabled and unclickable.
  - The "Today" shortcut button is disabled when today falls outside the allowed boundary.

---

## ❓ Troubleshooting & FAQ

#### Q: How do I reset the demo if I made too many test transfers?
> Click the **Reset Demo Data** button in the top navigation bar. It resets all products, inventory balances, transfers, and recommendations back to pristine enterprise baseline in less than 1 second.

#### Q: Can I run this without internet access?
> **Yes.** Because RetailHub Enterprise uses a client-side mock adapter and browser localStorage, the entire application functions 100% offline.

#### Q: What port does the application use?
> The frontend runs on `http://localhost:5173`. If port 5173 is occupied, Vite will automatically select the next available port (e.g. 5174).

#### Q: How do I build for production?
> Run `npm run build`. The optimized static assets will be output to the `/dist` directory.

---

<div align="center">
  <sub>Built for Enterprise High-Velocity Retail • RetailHub Enterprise Operations Platform</sub>
</div>
