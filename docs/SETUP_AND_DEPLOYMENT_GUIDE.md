# SkillBridge Setup, Database Migration & Deployment Guide

This document provides exhaustive, step-by-step instructions for initializing, configuring, migrating, and deploying the complete **SkillBridge** student services marketplace platform.

---

## 1. System Prerequisites & Environment

Ensure your local development machine satisfies the following minimum requirements:

- **Node.js**: `v18.17.0` or higher (tested up to `v20.x`)
- **Package Manager**: `npm v9.x` or higher
- **PostgreSQL / Supabase**: Supabase Cloud Project (PostgreSQL 15+) or local Supabase CLI (`v1.80+`)
- **Git**: `v2.30+`
- **Operating System**: Windows 10/11, macOS 13+, or Ubuntu 22.04 LTS

---

## 2. Repository Setup & Dependencies

Clone the SkillBridge repository and install all locked dependencies:

```bash
# 1. Clone repository
git clone https://github.com/soham-arch/SkillBridge.git
cd SkillBridge

# 2. Install dependencies cleanly
npm install

# 3. Verify TypeScript and Next.js compiler
npm run typecheck
```

---

## 3. Database Migration Sequence (PostgreSQL / Supabase)

SkillBridge relies on 15 sequential SQL migrations in `supabase/migrations/`. These migrations define core schemas, availability tables, atomic RPC procedures, RLS policies, payment ledgers, realtime order conversations, and verified rating triggers.

Execute migrations in strict numerical order via the Supabase SQL Editor or Supabase CLI:

```bash
# If using Supabase CLI locally:
supabase db reset
# or apply migrations individually:
supabase migration up
```

### Complete Migration Inventory

| # | Migration File | Primary Responsibility |
|---|----------------|------------------------|
| **001** | `20260816083516_001_create_core_schema.sql` | Core `profiles`, `services`, `orders`, `categories`, and foundational RLS |
| **002** | `20260822120000_002_seed_dummy_data.sql` | Baseline academic categories, demo tags, and campus departments |
| **003** | `20260822140000_003_bookings_and_availability.sql` | Consultation schedule slots, day-of-week recurrence, and provider calendars |
| **004** | `20260822140001_004_book_service_rpc.sql` | Atomic booking slot reservation RPC with anti-double-booking locks |
| **005** | `20260822150000_005_add_email_to_profiles.sql` | Synchronized user email column in `profiles` mirrored from `auth.users` |
| **006** | `20260822160000_006_orders_payments_verification.sql` | Escrow columns, ID verification documents table, payment attempts ledger |
| **007** | `20260822170000_007_auth_and_student_verification.sql` | Strict student verification states (`unverified`, `pending`, `verified`, `rejected`) |
| **008** | `20260822180000_008_admin_governance_and_security.sql` | Admin RBAC role checks, platform audit log triggers, and administrative overrides |
| **009** | `20260822190000_009_profiles_roles_and_media.sql` | Extended student profiles (skills, portfolio links, avatar storage paths) |
| **010** | `20260822200000_010_consolidate_marketplace_schema_and_rpc.sql` | Marketplace consolidation and authoritative search indices |
| **011** | `20260822210000_011_service_management_lifecycle.sql` | Dual service models (`gig` vs `consultation`), pricing, and seller publishing checks |
| **012** | `20260822220000_012_unified_booking_and_orders.sql` | Unified order state machine (`transition_order_state` RPC), anti-self-booking check |
| **013** | `20260822230000_013_payments_and_transactions.sql` | Razorpay order IDs, escrow release triggers, seller ledger, idempotent webhooks |
| **014** | `20260822240000_014_order_messaging_and_notifications.sql` | In-app order messages, deduplicated notification tables (`dedup_key`), Supabase Realtime |
| **015** | `20260822250000_015_verified_reviews_and_reputation.sql` | Verified reviews (`submit_verified_review` RPC), anti-self-review, moderation triggers |

### Verification Query

Run this query in your Supabase SQL editor to confirm successful migration:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```
*Expected tables*: `audit_logs`, `availability_slots`, `categories`, `notifications`, `order_messages`, `orders`, `payment_transactions`, `profiles`, `reviews`, `services`, `student_verifications`.

---

## 4. Supabase Storage Buckets & Security Policies

SkillBridge uses 4 dedicated storage buckets with explicit private/public access controls:

| Bucket Name | Privacy Level | Purpose | Allowed MIME Types | Max Size |
|-------------|---------------|---------|--------------------|----------|
| `avatars` | **Public** | Student profile images | `image/jpeg`, `image/png`, `image/webp` | 5 MB |
| `portfolio` | **Public** | Service listing cover images and work samples | `image/*`, `application/pdf` | 15 MB |
| `student-ids` | **Private** | Official university ID cards for verification | `image/*`, `application/pdf` | 10 MB |
| `deliverables`| **Private** | Work deliverables exchanged inside orders | All safe types (zip, pdf, code) | 50 MB |

### Bucket Policy Enforcement
Execute the following storage policy configuration in Supabase:

```sql
-- Allow authenticated users to upload their own student ID
CREATE POLICY "Student ID Private Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'student-ids' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Only platform admins and the owner may read student IDs
CREATE POLICY "Student ID Restricted Read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'student-ids' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
);
```

---

## 5. Environment Variables Configuration

Create a `.env.local` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env.local
```

### Complete Environment Variable Reference

```env
# ==============================================================================
# Supabase Configuration (Mandatory)
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==============================================================================
# Base URL Configuration
# ==============================================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==============================================================================
# Razorpay Test Mode Payment Gateway (Sandbox)
# ==============================================================================
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YourTestKeyId
RAZORPAY_KEY_SECRET=YourRazorpaySecretKey
RAZORPAY_WEBHOOK_SECRET=YourWebhookSecret

# ==============================================================================
# NVIDIA NIM AI Embeddings & Semantic Search (Optional / AI Search)
# ==============================================================================
NVIDIA_API_KEY=nvapi-your-nvidia-nim-api-key
NVIDIA_NEMOTRON_ENDPOINT=https://integrate.api.nvidia.com/v1/chat/completions

# ==============================================================================
# Resend Transactional Email Delivery (Optional)
# ==============================================================================
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM="SkillBridge Notifications <notifications@yourdomain.com>"
```

> [!CAUTION]
> **Secret Hygiene Rules**:
> 1. Never prefix `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NVIDIA_API_KEY`, or `RESEND_API_KEY` with `NEXT_PUBLIC_`.
> 2. Ensure `.env.local` remains strictly in `.gitignore`.

---

## 6. Supabase Authentication & Google OAuth Setup

1. **Email/Password Provider**:
   - In Supabase Dashboard -> **Authentication** -> **Providers** -> **Email**: Ensure Email provider is enabled.
   - For campus verification testing, you may toggle *Confirm email* according to your testing preferences.
2. **Google OAuth (Optional Campus Sign-In)**:
   - In Google Cloud Console, create OAuth 2.0 Credentials.
   - Authorized Redirect URI: `https://<your-project-id>.supabase.co/auth/v1/callback`.
   - Add Client ID and Client Secret in Supabase Dashboard -> **Authentication** -> **Providers** -> **Google**.
3. **URL Configuration**:
   - Site URL: `http://localhost:3000` (or your production URL).
   - Additional Redirect URLs:
     - `http://localhost:3000/**`
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/callback/client`

---

## 7. External Integrations Configuration

### A. Razorpay Test Mode Sandbox
1. Register for a free account at [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Toggle to **Test Mode** in the top navigation bar.
3. Navigate to **Settings** -> **API Keys** -> Generate Test Key.
4. Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env.local`.
5. Webhooks: Configure a webhook pointing to `https://your-domain/api/payments/webhook` with the `payment.captured` and `order.paid` events.

### B. NVIDIA NIM AI Semantic Search
1. Create a free developer account at [NVIDIA NGC](https://build.nvidia.com/).
2. Navigate to **Nemotron** or **Llama-3-70B-Instruct** model endpoints and generate an API key.
3. Set `NVIDIA_API_KEY` in `.env.local`.
4. *Graceful Fallback*: If `NVIDIA_API_KEY` is omitted, SkillBridge automatically uses PostgreSQL ILIKE, skill array intersection, and trigram text matching without crashing.

### C. Resend Email Service
1. Register at [Resend.com](https://resend.com) and obtain an API key.
2. Set `RESEND_API_KEY` in `.env.local`.
3. *Truthful Reporting*: If `RESEND_API_KEY` is absent, the server truthfully logs that email delivery is unconfigured rather than fabricating fake delivery.

---

## 8. Bootstrapping Platform Administrator

To initialize your first administrator account:

```bash
# Set ADMIN_EMAIL to your registered email address
node scripts/bootstrap-admin.mjs your-email@college.edu
```

Or execute directly in Supabase SQL editor:
```sql
UPDATE public.profiles 
SET is_admin = true, verification_status = 'verified' 
WHERE email = 'your-email@college.edu';
```

---

## 9. Local Verification & Running

Run the automated test suites, type checking, and linter:

```bash
# 1. Type check
npm run typecheck

# 2. Code linting
npm run lint

# 3. Complete automated test suite (607 tests across 12 suites)
npm run test:all

# 4. Launch local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 10. Production Deployment Guide (Vercel / Netlify)

### Vercel Deployment
1. Import repository into Vercel.
2. Framework Preset: **Next.js**.
3. Root Directory: `./`.
4. Add all environment variables from Section 5 in **Project Settings** -> **Environment Variables**.
5. Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://skillbridge.vercel.app`).
6. Deploy!

### Netlify Deployment
1. Import repository into Netlify.
2. SkillBridge includes `@netlify/plugin-nextjs` pre-configured in `package.json`.
3. Build command: `npm run build`.
4. Publish directory: `.next`.
5. Configure environment variables in Netlify UI.
6. Deploy site!
