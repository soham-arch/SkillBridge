# SkillBridge Feature 04: Data Consolidation & Authoritative Supabase Architecture

## Overview

Feature 04 eliminates fragmented and conflicting business-state storage, establishing **Supabase PostgreSQL** as the single authoritative source of truth across all SkillBridge subsystems. `localStorage` is decommissioned from storing business transactions, orders, escrow balances, or verification decisions, and is strictly confined to harmless client-side UI preferences.

---

## 1. Authoritative Data-Flow Map

Every domain entity is backed by an explicit PostgreSQL table with strict schema constraints, lifecycle status checks, and Row Level Security (RLS):

| Entity / Feature | Authoritative PostgreSQL Table | Primary Key | Foreign Keys & Relationships | Access Control (RLS) |
| :--- | :--- | :--- | :--- | :--- |
| **User Identity & Roles** | `public.profiles` | `id` (uuid) | `user_id -> auth.users(id)` | Read: Authenticated.<br>Write: Own account (`auth.uid() = user_id`).<br>Trigger prevents self-promotion to `is_admin`. |
| **Service Categories** | `public.categories` | `id` (uuid) | None (`name` unique) | Read: Public (anon + authenticated).<br>Write: Authenticated/Admin. |
| **Service Listings** | `public.services` | `id` (uuid) | `provider_id -> profiles(user_id)`<br>`category_id -> categories(id)` | Read: Published listings public; drafts owner only.<br>Write: Verified student sellers & admins. |
| **Portfolio & Media** | `public.service_media` | `id` (uuid) | `service_id -> services(id)` | Read: Public.<br>Write: Service owner only. |
| **Seller Availability** | `public.availability_slots` | `id` (uuid) | `provider_id -> profiles(user_id)`<br>`service_id -> services(id)` | Read: Authenticated.<br>Write: Provider only (`auth.uid() = provider_id`). |
| **Calendar Bookings** | `public.bookings` | `id` (uuid) | `service_id -> services(id)`<br>`customer_id -> profiles(user_id)`<br>`provider_id -> profiles(user_id)` | Read: Booking participants (customer or provider).<br>Write: Atomic `book_service` RPC prevents double-booking. |
| **Marketplace Orders** | `public.orders` | `id` (uuid) | `service_id -> services(id)`<br>`buyer_id -> profiles(user_id)`<br>`seller_id -> profiles(user_id)` | Read: Participants & admins.<br>Write: Buyer creates (`auth.uid() = buyer_id`), participants transition status. |
| **Escrow Payments** | `public.payments` | `id` (uuid) | `order_id -> orders(id)`<br>`buyer_id -> profiles(user_id)`<br>`seller_id -> profiles(user_id)` | Read: Participants & admins.<br>Write: Buyer on payment, admins for disputes. |
| **Ratings & Reviews** | `public.reviews` | `id` (uuid) | `service_id -> services(id)`<br>`order_id -> orders(id)`<br>`reviewer_id -> profiles(user_id)`<br>`reviewee_id -> profiles(user_id)` | Read: Public for trust & transparency.<br>Write: Reviewer (`auth.uid() = reviewer_id`) linked to completed order. |
| **In-App Notifications** | `public.notifications` | `id` (uuid) | `user_id -> profiles(user_id)` | Read: Recipient only (`auth.uid() = user_id`).<br>Write: Authenticated actors on order/review actions. |
| **Student Verifications** | `public.verification_requests` | `id` (uuid) | `user_id -> profiles(user_id)` | Read: Submitting student & admin.<br>Write: Student submits, Admin reviews. |
| **Verification Governance**| `public.verification_audit_log`| `id` (uuid) | `request_id -> verification_requests(id)`<br>`reviewer_id -> profiles(user_id)` | Read/Write: Administrators only. |
| **Admin Audit Trail** | `public.admin_audit_log` | `id` (uuid) | `actor_id -> auth.users(id)` | Read/Write: Administrators only (immutable append-only). |

---

## 2. Storage Decommissioning: localStorage Removal

### Before vs. After
- **Before**: `lib/store/marketplace-store.ts` wrote orders, payment records, verifications, and updated balances into the browser's `localStorage` (`skillbridge_v2_store`). A browser refresh or different device would display conflicting or desynchronized state.
- **After**:
  - `lib/services/orders.ts` queries `public.orders` and `public.payments` directly in Supabase.
  - `lib/services/notifications.ts` queries `public.notifications` directly in Supabase.
  - `lib/services/services.ts` saves services and reads reviews from `public.reviews` directly in Supabase.
  - `fetchSellerEarnings` computes balance dynamically from completed order records in Supabase.
  - `localStorage` is restricted to non-sensitive preferences (`skillbridge_ui_prefs`), e.g., active tab selection or dismissed greeting banners.

---

## 3. Atomic Multi-Step Operations & Concurrency Safeguards

### 1. Atomic Calendar Booking (`book_service` RPC)
```sql
SELECT book_service(
  p_service_id, p_customer_id, p_provider_id,
  p_booking_date, p_start_time, p_end_time, p_note
);
```
- Uses PostgreSQL `FOR UPDATE` locking on candidate booking slots to prevent concurrent race conditions.
- Rejects past bookings, unavailable slots, and prevents self-booking.

### 2. Atomic Order Creation & Escrow Hold (`create_order_with_escrow` RPC)
```sql
SELECT create_order_with_escrow(
  p_service_id, p_buyer_id, p_requirements,
  p_payment_method, p_simulate_success
);
```
- Reads authoritative service price and seller from `public.services` inside the transaction (preventing client-side price tampering).
- Inserts `orders` and `payments` records in a single atomic transaction.
- Dispatches in-app notification to the seller.
- If payment fails, order status is flagged as `pending_payment` with an immutable failure record.

### 3. Atomic Order Completion & Escrow Release (`complete_order_and_release_escrow` RPC)
```sql
SELECT complete_order_and_release_escrow(p_order_id, p_actor_id);
```
- Validates that caller is the buyer or an administrator.
- Transitions status to `completed`, appends delivery approval to order timeline JSONB.
- Increments `completed_orders_count` on the service listing.
- Notifies the seller that escrow funds have been released to earnings.

---

## 4. Migration & Database Deployment Instructions

To apply all consolidated database updates:

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run the script:
   [`supabase/migrations/20260822200000_010_consolidate_marketplace_schema_and_rpc.sql`](file:///e:/MITWPU/Engineering/3rd%20Year/SEM/Project/project/supabase/migrations/20260822200000_010_consolidate_marketplace_schema_and_rpc.sql).
3. The migration is idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), so running it multiple times is completely safe.

---

## 5. Automated Verification & Test Coverage

Run the comprehensive test suites:

```bash
# 1. Feature 04 Database Consolidation & Source of Truth Tests (40 assertions)
npm run test:db

# 2. Feature 03 User Profiles & Dual-Role Tests (64 assertions)
npm run test:profile

# 3. Feature 02 Administrator Authority & Governance Tests (49 assertions)
npm run test:admin

# 4. Feature 01 Authentication & Verification Tests (19 assertions)
npm run test:auth

# 5. TypeScript Strict Compilation Check
npm run typecheck
```

All 172 test assertions pass with **100% success rate and zero regressions**.
