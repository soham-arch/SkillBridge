# SkillBridge Feature 03: User Profiles, Buyer/Seller Roles & Onboarding

## Overview

Feature 03 implements a unified user identity, onboarding wizard, dual-role system, and privacy-protected profile experience across SkillBridge. Students can participate as **Buyers** (hiring, purchasing, ordering services), **Sellers** (freelancers offering services, skills, portfolio showcases), or **Both**, all within a single authenticated account.

---

## 1. Role & Identity Architecture

### Role Modeling
- `capabilities text[]`: Stores platform capabilities:
  - `['find', 'buyer']`: Buyer permissions (browse, hire, communicate, place orders, review).
  - `['offer', 'seller']`: Seller permissions (publish listings, manage orders, earn payouts).
  - `['find', 'buyer', 'offer', 'seller']`: Dual-role account with both capabilities.
- `active_role text`: Indicates the current UI workspace context (`'buyer'` or `'seller'`).
- `onboarding_completed boolean`: Set to `true` when a student finishes the initial onboarding flow.
- `seller_onboarding_completed boolean`: Set to `true` when seller specialization (skills, categories, pricing, portfolio) is submitted.

### Intentional Role Switching
- A student with dual roles can switch their active context using the header pill toggle or profile settings (`switchActiveRole(userId, newRole)`).
- **Zero Account Switching**: No need to log out, create secondary accounts, or impersonate demo personas.

---

## 2. Structured Onboarding Flow (`/onboarding`)

The onboarding wizard runs immediately after student verification approval:

1. **Step 1: Identity & Avatar**
   - Full name, campus/college name, location/hostel.
   - Profile picture upload to the secured `avatars` bucket.
   - Bio explaining interests.
2. **Step 2: Role Selection**
   - **Buyer**: "I want to hire student freelancers and explore campus services."
   - **Seller**: "I want to offer my skills, publish services, and earn income."
   - **Both**: "I want to buy services and offer my own skills."
3. **Step 3: Seller Specialization** *(Active for Seller or Both)*
   - Skills selection (chips from popular tech/design/academic skills + custom skills).
   - Preferred service categories (Design, Tech, Tutoring, Writing, Video, etc.).
   - Pricing preferences: Starting price (₹), Hourly rate (₹), Negotiable toggle.
   - Portfolio showcase items (Project titles and external URLs or uploaded media).
   - Social links (GitHub, LinkedIn, personal website).
4. **Step 4: Review & Launch**
   - Summary card of student profile and selected capabilities.
   - Launches user directly into their active workspace dashboard (`/dashboard?mode=buyer` or `/dashboard?mode=seller`).

---

## 3. Privacy Boundaries & Data Protection

- **Student ID Confidentiality**:
  - Student PRN / ID numbers and uploaded verification card documents are strictly restricted to admin verification workflows and never rendered on public profile pages.
- **Public Profile (`/profile/[id]`)**:
  - Displays: Verified student badge, full name, avatar, college, bio, skills, pricing preferences, portfolio items, published services, and genuine buyer reviews.
  - Excludes: Private identification numbers, verification files, and internal governance fields.
- **Anti-Privilege Escalation**:
  - The `updateUserProfile` client helper and database triggers strictly prohibit user mutations to `is_admin` or `verification_status`.

---

## 4. Media Storage Buckets & Policies

Configured in `supabase/migrations/20260822190000_009_profiles_roles_and_media.sql`:

| Bucket | Access | Allowed MIME Types | File Size Limit | RLS Policy |
| :--- | :--- | :--- | :--- | :--- |
| `avatars` | Public Read | JPEG, PNG, WebP, GIF | 5 MB | Authenticated users can only insert/update/delete objects in their own folder `(auth.uid() = foldername)`. |
| `portfolio-media` | Public Read | JPEG, PNG, WebP, PDF | 15 MB | Authenticated users can only insert/update/delete objects in their own folder `(auth.uid() = foldername)`. |

---

## 5. Post-Login Routing Matrix

When an authenticated user completes sign-in, the system routes them dynamically:

| Student State | Verification Status | Onboarding Completed | Destination Route |
| :--- | :--- | :--- | :--- |
| Unverified | `not_verified` | False | `/verify` |
| Pending Verification | `pending` | False | `/verify/pending` |
| Rejected Verification | `rejected` | False | `/verify/rejected` |
| Verified (New) | `verified` | **False** | `/onboarding` |
| Verified (Buyer) | `verified` | **True** | `/dashboard?mode=buyer` |
| Verified (Seller) | `verified` | **True** | `/dashboard?mode=seller` |
| Administrator | Any | N/A | `/admin` (or intended admin URL) |

---

## 6. Running Tests

```bash
# Run Feature 03 Profile, Roles & Onboarding tests (64 assertions)
npm run test:profile

# Run Feature 01 Authentication & Verification tests (19 assertions)
npm run test:auth

# Run Feature 02 Admin Governance tests (49 assertions)
npm run test:admin

# Run TypeScript typecheck
npm run typecheck
```
