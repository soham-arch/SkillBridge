# Real Buyer, Seller & Admin Dashboards

## Executive Overview

SkillBridge Feature 11 eliminates all fabricated statistics, hardcoded mock fallbacks (`?? 2700`, `?? 1500`, `?? 18`, `|| 3`), and misleading indicators across all dashboards. Every metric, progress indicator, and action card is strictly derived from authoritative database records in Supabase PostgreSQL.

---

## 1. Metric Definitions & Data Sources

### 1.1 Buyer Dashboard Metrics

| Metric | Database Query / Derivation | Definition & Integrity Guarantee |
| :--- | :--- | :--- |
| **Active Purchases** | `orders.filter(status IN ('seller_pending', 'accepted', 'in_progress', 'submitted', 'revision_requested')).length` | Count of active gigs currently being fulfilled by seller. Excludes completed, cancelled, and declined orders. |
| **Escrow Protected** | `orders.filter(payment_status = 'paid' AND status NOT IN ('completed', 'cancelled', 'rejected')).reduce(sum + price, 0)` | Total buyer funds currently locked safely in SkillBridge escrow. Zero risk of lost funds before deliverable approval. |
| **Completed Purchases** | `orders.filter(status = 'completed').length` | Finished transactions where buyer approved deliverables and released funds to the provider. |
| **Upcoming Consultations** | `consultations.filter(status = 'confirmed').length` | Scheduled 1-on-1 tutoring, mentoring, or consultation appointments on the calendar. |
| **Awaiting Review** | `orders.filter(status = 'completed' AND review IS NULL).length` | Completed purchases where the buyer has not yet submitted a verified review. |

---

### 1.2 Seller Studio Metrics

| Metric | Database Query / Derivation | Definition & Integrity Guarantee |
| :--- | :--- | :--- |
| **Total Earned** | `orders.filter(status = 'completed' AND payment_status = 'paid').reduce(sum + price, 0)` | Authoritative cumulative earnings from approved deliverables. Strictly disjoint from in-progress escrow. |
| **Held in Escrow** | `orders.filter(payment_status = 'paid' AND status NOT IN ('completed', 'cancelled', 'rejected')).reduce(sum + price, 0)` | Client payments currently held safely in escrow pending seller deliverable submission and buyer approval. |
| **Completed Orders** | `orders.filter(status = 'completed' AND payment_status = 'paid').length` | Total number of successfully completed orders fulfilled by this seller. |
| **Active Services** | `services.filter(status = 'published').length` | Publicly searchable listings currently open for student orders and bookings. |
| **Incoming Requests** | `orders.filter(status IN ('seller_pending', 'pending_payment')).length` | New client orders awaiting seller acceptance or decline before work begins. |

---

### 1.3 Platform Command Center (Admin Metrics)

| Metric | Database Query / Derivation | Description |
| :--- | :--- | :--- |
| **Total Students** | `SELECT count(*) FROM public.profiles` | Total registered student accounts on the platform. |
| **Verified Students** | `profiles.filter(verification_status = 'verified').length` | Students with verified official college ID cards. |
| **Active Services** | `services.filter(status = 'published').length` | Total active listings available across all categories. |
| **Total Orders** | `SELECT count(*) FROM public.orders` | Platform-wide transaction count. |
| **Completed Orders** | `orders.filter(status = 'completed').length` | Platform-wide fulfilled transactions. |
| **Gross Marketplace Volume (GMV)**| `orders.filter(payment_status = 'paid').reduce(sum + price, 0)` | Total gross transaction volume processed across SkillBridge. |
| **Pending Verification Queue** | `verification_requests.filter(status = 'pending').length` | ID cards awaiting administrative review. |
| **Reported Reviews** | `review_reports.filter(status = 'pending').length` | Community flagged reviews awaiting moderation. |

---

## 2. Double-Counting Prevention Proof

To guarantee financial and statistical accuracy, order states in PostgreSQL are mutually exclusive:

```
[ pending_payment ] ──(payment_paid)──> [ seller_pending ]
                                               │
                                 ┌─────────────┴─────────────┐
                           (declined)                   (accepted)
                                 ▼                           ▼
                           [ rejected ]                [ in_progress ]
                         (Escrow Refunded)                   │
                                                             ▼
                                                       [ submitted ]
                                                             │
                                                       (buyer_approve)
                                                             ▼
                                                       [ completed ]
                                                    (Payout Released)
```

### Mathematical Proof of Mutual Exclusivity:
1. **Total Earned vs. Held in Escrow**:
   - `Total Earned` requires `status = 'completed'`.
   - `Held in Escrow` requires `status != 'completed'` and `status != 'cancelled'` and `status != 'rejected'`.
   - Since an order can have only one `status` at any timestamp in PostgreSQL, an order's amount can **never** appear in both `Total Earned` and `Held in Escrow`.
2. **Refunded vs. Active Escrow**:
   - Cancelled or rejected orders have `payment_status = 'refunded'`.
   - `Held in Escrow` strictly filters for `payment_status = 'paid'`.
   - Therefore, refunded transactions are excluded from active platform escrow.

---

## 3. Coherent Navigation Map

```mermaid
flowchart LR
    Header[Site Header / Navbar] --> Dashboard[/dashboard]
    Header --> Explore[/explore]
    Header --> Orders[/orders]
    Header --> Bookings[/bookings]
    Header --> MyServices[/my-services]
    Header --> Profile[/profile]
    Header --> Admin[/admin]

    Dashboard -->|Buyer Hub| Orders
    Dashboard -->|Buyer Hub| Bookings
    Dashboard -->|Buyer Hub| ReviewModal[Leave Review Modal]
    Dashboard -->|Seller Studio| IncomingRequests[Accept / Decline Actions]
    Dashboard -->|Seller Studio| MyServices
    Dashboard -->|Seller Studio| CreateService[/services/create]
    Dashboard -->|Trust Badge| Verify[/verify]

    Orders -->|Inspect Escrow & Chat| OrderDetail[/orders/:id]
    MyServices -->|Edit Listing| EditService[/services/:id/edit]
    Admin -->|Review Verification| VerifyModal
    Admin -->|Moderate Reviews| ReviewsTab[Review Moderation]
```

---

## 4. UI/UX Resilience & State Handling

Every dashboard card incorporates:
- **Loading State**: Animated pulses and loading spinners preventing layout shift.
- **Error State**: Informative error message banner with a one-click **"Retry Loading"** trigger.
- **Empty State**: Tailored empty states with context-aware calls to action:
  - Empty Buyer Orders $\to$ "Explore Campus Marketplace"
  - Empty Buyer Consultations $\to$ "Schedule a Consultation"
  - Empty Seller Requests $\to$ "Zero pending orders awaiting acceptance"
  - Empty Seller Listings $\to$ "Offer a Peer Skill"
- **Role Restrictions**:
  - Unauthenticated users are redirected to `/login`.
  - Buyers attempting to access seller features without a seller profile receive an onboard setup prompt.
  - Non-administrators attempting to access `/admin` receive a 403 Forbidden screen.
